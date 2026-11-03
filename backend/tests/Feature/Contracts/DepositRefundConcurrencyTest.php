<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractSettlementService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\Support\InteractsWithContractSettlement;
use Tests\TestCase;

class DepositRefundConcurrencyTest extends TestCase
{
    use InteractsWithContractSettlement;

    public function test_two_admin_processes_keep_one_refund_confirmation_and_never_reallocate_money(): void
    {
        CarbonImmutable::setTestNow('2026-10-30 08:00:00 UTC');
        $this->prepareSettlementSchema();
        $migration = require database_path('migrations/pending/2026_11_02_100001_add_deposit_refund_confirmation_to_contracts_table.php');
        $migration->up();
        $this->assertSame(0, User::count(), 'Committed race fixtures require an empty protected test DB.');
        $beforeServices = Service::pluck('id')->all();
        $admins = [];
        $owner = $contract = null;
        $processes = [];
        try {
            $admins = [User::factory()->role(UserRole::Admin)->create(), User::factory()->role(UserRole::Admin)->create()];
            [$contract,,$owner] = DB::transaction(fn () => $this->settlementFixture($admins[0], 5000000));
            $s = app(ContractSettlementService::class);
            $p = $s->preview($contract, $admins[0]);
            $p = $s->terminate($contract, $admins[0], ['confirmed' => true, 'expected_revision' => $p['revision']]);
            $before = [];
            foreach (['payments', 'invoices', 'invoice_items', 'rooms', 'notifications'] as $t) {
                $before[$t] = DB::table($t)->orderBy('id')->get()->toJson();
            }
            DB::beginTransaction();
            Room::whereKey($contract->room_id)->lockForUpdate()->firstOrFail();
            foreach ($admins as $admin) {
                $input = ['action' => 'refund', 'actor' => $admin->id, 'contract' => $contract->id, 'revision' => $p['revision'], 'refund_amount' => 2100000];
                $process = new Process([PHP_BINARY, base_path('tests/Support/RunSettlementAction.php'), json_encode($input, JSON_THROW_ON_ERROR)], base_path(), ['DB_CONNECTION' => 'mysql_test', 'APP_ENV' => 'testing']);
                $process->setTimeout(45);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 30;
            while (count(array_filter($processes, fn ($process) => str_contains($process->getOutput(), "READY\n"))) !== 2) {
                if (microtime(true) > $deadline) {
                    $this->fail('Refund children did not reach barrier.');
                }usleep(10000);
            }
            foreach ($processes as $process) {
                $this->assertTrue($process->isRunning(), 'Room lock was bypassed.');
            }
            DB::commit();
            $results = [];
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), $process->getErrorOutput().$process->getOutput());
                $lines = explode("\n", trim($process->getOutput()));
                $results[] = json_decode(end($lines), true, flags: JSON_THROW_ON_ERROR);
            }
            $this->assertSame([200, 200], array_column($results, 'status'));
            $this->assertSame($results[0]['refunded_by'], $results[1]['refunded_by']);
            $this->assertSame($results[0]['refunded_at'], $results[1]['refunded_at']);
            $this->assertContains($contract->fresh()->deposit_refunded_by, [$admins[0]->id, $admins[1]->id]);
            $this->assertSame(2100000, $contract->fresh()->deposit_refund_amount);
            $this->assertSame(0, $s->preview($contract->fresh(), $admins[0])['refund_outstanding_amount']);
            foreach ($before as $t => $rows) {
                $this->assertSame($rows, DB::table($t)->orderBy('id')->get()->toJson(), $t.' changed during refund confirmation');
            }
        } finally {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
            if ($contract) {
                $ids = DB::table('invoices')->where('contract_id', $contract->id)->pluck('id');
                DB::table('payments')->whereIn('invoice_id', $ids)->delete();
                DB::table('meter_readings')->where('contract_id', $contract->id)->delete();
                DB::table('invoice_items')->whereIn('invoice_id', $ids)->delete();
                DB::table('invoices')->whereIn('id', $ids)->delete();
                DB::table('contract_services')->where('contract_id', $contract->id)->delete();
                DB::table('contracts')->where('id', $contract->id)->delete();
                $room = $contract->room;
                $building = $room->building;
                DB::table('utility_prices')->where('building_id', $building->id)->delete();
                $room->delete();
                $building->delete();
            }
            foreach (array_filter([$owner, ...$admins]) as $user) {
                DB::table('notifications')->where('notifiable_type', 'user')->where('notifiable_id', $user->id)->delete();
                $user->delete();
            }
            Service::whereNotIn('id', $beforeServices)->delete();
            $migration->down();
            $this->restoreSettlementSchema();
            CarbonImmutable::setTestNow();
        }
    }
}
