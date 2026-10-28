<?php

namespace Tests\Feature\Payments;

use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Room;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use App\Support\Money;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class PaymentConcurrencyTest extends TestCase
{
    public static function races(): array
    {
        return ['same confirmation' => ['same'], 'competing confirmations' => ['competing'], 'direct cash' => ['cash'],
            'confirmation versus cancellation' => ['confirm_cancel'], 'submission versus cancellation' => ['proof_cancel']];
    }

    #[DataProvider('races')]
    public function test_real_processes_keep_receipts_ledger_and_files_consistent(string $race): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $schema = require database_path('migrations/pending/2026_10_14_400019_create_attachments_table.php');
        $schema->up();
        $owner = $admin = $contract = null;
        $processes = [];
        $beforeFiles = Storage::disk('private')->allFiles('payment-proofs');
        $temp = tempnam(sys_get_temp_dir(), 'pay-parent-');
        try {
            $owner = User::factory()->role(UserRole::Resident)->create();
            $admin = User::factory()->role(UserRole::Admin)->create();
            $period = now(config('app.business_timezone'))->startOfMonth()->format('Y-m-d');
            $contract = Contract::factory()->active()->create(['user_id' => $owner->id, 'start_date' => $period, 'monthly_rent' => 1000000]);
            $invoices = app(InvoiceService::class);
            $draft = $invoices->createMonthly(['contract_id' => $contract->id, 'period' => $period]);
            $invoice = $invoices->issue($draft, $draft->revision());
            $service = app(PaymentService::class);
            $base = ['actor' => $admin->id, 'invoice' => $invoice->id, 'revision' => $invoice->revision()];
            $actions = [['action' => 'cash', ...$base], ['action' => 'cash', ...$base]];
            if (in_array($race, ['same', 'competing', 'confirm_cancel'], true)) {
                file_put_contents($temp, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
                $first = $service->store($invoice, $owner, ['amount' => 700000], new UploadedFile($temp, 'proof.png', null, null, true));
                $second = $race === 'competing' ? $service->store($invoice, $owner, ['amount' => 700000], new UploadedFile($temp, 'proof.png', null, null, true)) : $first;
                $actions = [['action' => 'confirm', ...$base, 'payment' => $first->id, 'amount' => 700000, 'revision' => $first->revision()],
                    $race === 'confirm_cancel' ? ['action' => 'cancel', ...$base] : ['action' => 'confirm', ...$base, 'payment' => $second->id, 'amount' => 700000, 'revision' => $second->revision()]];
            } elseif ($race === 'proof_cancel') {
                $actions = [['action' => 'proof', ...$base, 'actor' => $owner->id], ['action' => 'cancel', ...$base]];
            }
            DB::beginTransaction();
            Room::whereKey($contract->room_id)->lockForUpdate()->firstOrFail();
            foreach ($actions as $input) {
                $process = new Process([PHP_BINARY, base_path('tests/Support/RunPaymentAction.php'), json_encode($input, JSON_THROW_ON_ERROR)], base_path(), ['DB_CONNECTION' => 'mysql_test', 'APP_ENV' => 'testing']);
                $process->setTimeout(30);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 10;
            while (count(array_filter($processes, fn ($p) => str_contains($p->getOutput(), "READY\n"))) !== 2) {
                if (microtime(true) > $deadline) {
                    $this->fail('Payment children did not reach the ready barrier.');
                }
                usleep(10000);
            }
            foreach ($processes as $process) {
                $this->assertTrue($process->isRunning(), 'Payment child bypassed the parent room lock.');
            }
            DB::commit();
            $statuses = [];
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), $process->getErrorOutput().$process->getOutput());
                $lines = explode("\n", trim($process->getOutput()));
                $statuses[] = json_decode(end($lines), true, flags: JSON_THROW_ON_ERROR)['status'];
            }
            sort($statuses);
            $saved = $invoice->fresh();
            $payments = Payment::where('invoice_id', $invoice->id)->get();
            $this->assertSame($saved->paid_amount, Money::sum($payments->where('status', PaymentStatus::Confirmed)->pluck('amount')->all()));
            $this->assertLessThanOrEqual($saved->total_amount, $saved->paid_amount);
            if ($race === 'same') {
                $this->assertSame([200, 200], $statuses);
            } elseif ($race === 'proof_cancel') {
                $this->assertContains($statuses, [[200, 409], [201, 409]]);
                $this->assertSame($saved->status->value === 'cancelled' ? 0 : 1, $payments->count());
            } else {
                $this->assertSame($race === 'cash' ? [201, 409] : [200, 409], $statuses);
            }
            $expectedConfirmed = $race === 'proof_cancel' ? 0 : 1;
            $this->assertSame($expectedConfirmed, $payments->where('status', PaymentStatus::Confirmed)->count());
            $this->assertSame($expectedConfirmed, $payments->whereNotNull('receipt_number')->count());
            $newFiles = array_diff(Storage::disk('private')->allFiles('payment-proofs'), $beforeFiles);
            $this->assertCount(DB::table('attachments')->where('attachable_type', 'payment')->whereIn('attachable_id', $payments->modelKeys())->count(), $newFiles);
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
                $ids = Invoice::where('contract_id', $contract->id)->pluck('id');
                $payments = Payment::whereIn('invoice_id', $ids)->pluck('id');
                DB::table('attachments')->where('attachable_type', 'payment')->whereIn('attachable_id', $payments)->delete();
                DB::table('payments')->whereIn('id', $payments)->delete();
                DB::table('invoice_items')->whereIn('invoice_id', $ids)->delete();
                DB::table('invoices')->whereIn('id', $ids)->delete();
                DB::table('contracts')->where('id', $contract->id)->delete();
                $room = $contract->room;
                $room->delete();
                $room->building->delete();
            }
            $owner?->delete();
            $admin?->delete();
            foreach (array_diff(Storage::disk('private')->allFiles('payment-proofs'), $beforeFiles) as $path) {
                if (! preg_match('~^payment-proofs/[a-zA-Z0-9]{40}\.(png|jpg|jpeg|webp)$~D', $path)) {
                    throw new \RuntimeException('Unexpected test evidence path; do not delete.');
                }
                Storage::disk('private')->delete($path);
            }
            if (is_file($temp)) {
                unlink($temp);
            }
            $schema->down();
        }
    }
}
