<?php

namespace Tests\Feature\Invoices;

use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Room;
use App\Services\InvoiceService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class InvoiceConcurrencyTest extends TestCase
{
    public static function races(): array
    {
        return ['create/create' => ['create'], 'issue/issue' => ['issue'], 'issue/cancel' => ['cancel']];
    }

    #[DataProvider('races')]
    public function test_real_processes_serialize_without_duplicate_or_partial_invoice(string $other): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $contract = Contract::factory()->active()->create(['start_date' => now(config('app.business_timezone'))->startOfMonth()->format('Y-m-d')]);
        $processes = [];
        try {
            $data = ['contract_id' => $contract->id, 'period' => $contract->start_date->format('Y-m-d')];
            if ($other !== 'create') {
                $invoice = app(InvoiceService::class)->createMonthly($data);
                $data = ['id' => $invoice->id, 'revision' => $invoice->revision()];
            }
            DB::beginTransaction();
            Room::whereKey($contract->room_id)->lockForUpdate()->firstOrFail();
            foreach ([$other === 'create' ? 'create' : 'issue', $other] as $action) {
                $process = new Process([PHP_BINARY, base_path('tests/Support/RunInvoiceAction.php'), json_encode(compact('action', 'data'), JSON_THROW_ON_ERROR)], base_path(), ['DB_CONNECTION' => 'mysql_test', 'APP_ENV' => 'testing']);
                $process->setTimeout(30);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 10;
            while (count(array_filter($processes, fn ($p) => str_contains($p->getOutput(), "READY\n"))) !== 2) {
                if (microtime(true) > $deadline) {
                    $this->fail('Children did not reach the invoice ready barrier.');
                }
                usleep(10000);
            }
            foreach ($processes as $process) {
                $this->assertTrue($process->isRunning(), 'Child bypassed room lock.');
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
            $this->assertSame($other === 'create' ? [201, 409] : [200, 409], $statuses);
            $saved = Invoice::where('contract_id', $contract->id)->sole();
            $this->assertContains($saved->status->value, $other === 'create' ? ['draft'] : ($other === 'issue' ? ['issued'] : ['issued', 'cancelled']));
            $this->assertSame(3500000, $saved->total_amount);
            $this->assertSame(1, $saved->items()->count());
            $this->assertSame(0, $saved->payments()->count());
        } finally {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
            $invoices = Invoice::where('contract_id', $contract->id)->pluck('id');
            DB::table('invoice_items')->whereIn('invoice_id', $invoices)->delete();
            DB::table('invoices')->whereIn('id', $invoices)->delete();
            DB::table('contracts')->where('id', $contract->id)->delete();
            $room = $contract->room;
            $room->delete();
            $room->building->delete();
            $contract->tenant->delete();
        }
    }
}
