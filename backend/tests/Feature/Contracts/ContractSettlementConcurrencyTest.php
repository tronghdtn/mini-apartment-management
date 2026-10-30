<?php

namespace Tests\Feature\Contracts;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractSettlementService;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\Support\InteractsWithContractSettlement;
use Tests\TestCase;

class ContractSettlementConcurrencyTest extends TestCase
{
    use InteractsWithContractSettlement;

    public static function races(): array
    {
        return ['repeated terminate' => ['terminate'], 'new pending' => ['proof'], 'cash versus deposit' => ['cash'],
            'confirm pending' => ['confirm'], 'cancel zero final' => ['cancel'], 'cancel unpaid monthly' => ['monthly_cancel']];
    }

    #[DataProvider('races')]
    public function test_real_processes_serialize_deposit_closure_and_competing_payments(string $race): void
    {
        CarbonImmutable::setTestNow('2026-10-30 08:00:00 UTC');
        $this->prepareSettlementSchema();
        $this->assertSame(0, User::count(), 'Concurrency fixtures require an empty protected test database.');
        $beforeServices = Service::pluck('id')->all();
        $beforeFiles = Storage::disk('private')->allFiles('payment-proofs');
        $processes = [];
        $contract = $admin = $owner = null;
        try {
            $admin = User::factory()->role(UserRole::Admin)->create();
            $zeroDeposit = in_array($race, ['cancel', 'monthly_cancel'], true);
            [$contract, $invoice, $owner, $monthly] = DB::transaction(fn () => $this->settlementFixture($admin, $zeroDeposit ? 0 : 3000000,
                history: $race === 'monthly_cancel' ? 'arrears' : '', sameDay: $race === 'cancel'));
            $cancelTarget = $race === 'monthly_cancel' ? app(InvoiceService::class)->find($monthly[1]) : $invoice;
            $settlement = app(ContractSettlementService::class);
            $base = ['actor' => $admin->id, 'invoice' => $cancelTarget->id, 'contract' => $contract->id,
                'invoice_revision' => $cancelTarget->revision()];
            if ($race === 'confirm') {
                $temporary = tempnam(sys_get_temp_dir(), 'settlement-proof-');
                try {
                    file_put_contents($temporary, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
                    $pending = app(PaymentService::class)->store($invoice, $owner, ['amount' => 400000], new UploadedFile($temporary, 'proof.png', null, null, true));
                } finally {
                    unlink($temporary);
                }
                $base += ['payment' => $pending->id, 'payment_revision' => $pending->revision()];
            }
            $preview = $settlement->preview($contract, $admin);
            $base['revision'] = $preview['revision'];
            $actions = [['action' => 'terminate', ...$base], ['action' => $race === 'monthly_cancel' ? 'cancel' : $race, ...$base,
                'actor' => $race === 'proof' ? $owner->id : $admin->id]];
            DB::beginTransaction();
            Room::whereKey($contract->room_id)->lockForUpdate()->firstOrFail();
            foreach ($actions as $input) {
                $process = new Process([PHP_BINARY, base_path('tests/Support/RunSettlementAction.php'), json_encode($input, JSON_THROW_ON_ERROR)],
                    base_path(), ['DB_CONNECTION' => 'mysql_test', 'APP_ENV' => 'testing']);
                $process->setTimeout(40);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 15;
            while (count(array_filter($processes, fn ($process) => str_contains($process->getOutput(), "READY\n"))) !== 2) {
                if (microtime(true) > $deadline) {
                    $this->fail('Settlement children did not reach the barrier.');
                }
                usleep(10000);
            }
            foreach ($processes as $process) {
                $this->assertTrue($process->isRunning(), 'Child bypassed the held room lock.');
            }
            DB::commit();
            $results = [];
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), $process->getErrorOutput().$process->getOutput());
                $lines = explode("\n", trim($process->getOutput()));
                $results[] = json_decode(end($lines), true, flags: JSON_THROW_ON_ERROR);
            }
            $statuses = array_column($results, 'status');
            sort($statuses);
            if ($race === 'terminate') {
                $this->assertSame([200, 200], $statuses);
            } elseif ($race === 'proof') {
                $this->assertContains($statuses, [[200, 409], [201, 409]]);
            } elseif ($race === 'cash') {
                $this->assertContains($statuses, [[200, 409], [201, 409]]);
            } else {
                $this->assertSame([200, 409], $statuses);
            }
            $current = $contract->fresh();
            $saved = $invoice->fresh();
            $payments = Payment::where('invoice_id', $invoice->id)->get();
            $this->assertSame($saved->paid_amount, Money::sum($payments->where('status', PaymentStatus::Confirmed)->pluck('amount')->all()));
            $this->assertLessThanOrEqual($saved->total_amount, $saved->paid_amount);
            $closed = $current->status->value === 'terminated';
            $this->assertSame($closed ? 'available' : 'occupied', $contract->room->fresh()->status->value);
            $this->assertSame($closed ? 'settled' : ($zeroDeposit ? 'unpaid' : 'held'), $current->deposit_status->value);
            $this->assertSame($closed && ! $zeroDeposit ? 1 : 0, $payments->where('method', PaymentMethod::Deposit)->count());
            if ($race === 'monthly_cancel') {
                $this->assertSame($closed ? 'issued' : 'cancelled', $cancelTarget->fresh()->status->value);
            }
            $this->assertSame($closed ? 1 : 0, DB::table('notifications')->where('type', 'contract.terminated')->where('notifiable_id', $owner->id)->count());
            if ($closed) {
                $settlement->terminate($current, $admin, ['expected_revision' => $preview['revision'], 'confirmed' => true]);
                $this->assertSame(1, DB::table('notifications')->where('type', 'contract.terminated')->where('notifiable_id', $owner->id)->count());
            }
            if ($race === 'confirm') {
                $this->assertFalse($closed);
                $this->assertSame(400000, $saved->paid_amount);
            }
        } finally {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
            if ($contract) {
                $invoiceIds = Invoice::where('contract_id', $contract->id)->pluck('id');
                $paymentIds = Payment::whereIn('invoice_id', $invoiceIds)->pluck('id');
                DB::table('attachments')->where('attachable_type', 'payment')->whereIn('attachable_id', $paymentIds)->delete();
                DB::table('payments')->whereIn('id', $paymentIds)->delete();
                DB::table('meter_readings')->where('contract_id', $contract->id)->delete();
                DB::table('invoice_items')->whereIn('invoice_id', $invoiceIds)->delete();
                DB::table('invoices')->whereIn('id', $invoiceIds)->delete();
                DB::table('contract_services')->where('contract_id', $contract->id)->delete();
                DB::table('contracts')->where('id', $contract->id)->delete();
                $room = $contract->room;
                DB::table('utility_prices')->where('building_id', $room->building_id)->delete();
                $room->delete();
                $room->building->delete();
            }
            foreach ([$owner, $admin] as $user) {
                if ($user) {
                    DB::table('notifications')->where('notifiable_type', 'user')->where('notifiable_id', $user->id)->delete();
                    $user->delete();
                }
            }
            Service::whereNotIn('id', $beforeServices)->delete();
            foreach (array_diff(Storage::disk('private')->allFiles('payment-proofs'), $beforeFiles) as $path) {
                if (! preg_match('~^payment-proofs/[a-zA-Z0-9]{40}\.(png|jpg|jpeg|webp)$~D', $path)) {
                    throw new \RuntimeException('Unexpected evidence path.');
                }
                Storage::disk('private')->delete($path);
            }
            $this->restoreSettlementSchema();
            CarbonImmutable::setTestNow();
        }
    }
}
