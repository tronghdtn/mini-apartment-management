<?php

namespace Tests\Feature\Utilities;

use App\Enums\ServiceStatus;
use App\Models\Building;
use App\Models\Contract;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class MeterReadingConcurrencyTest extends TestCase
{
    public static function races(): array
    {
        return ['duplicate reading' => ['reading'], 'price change versus reading' => ['price']];
    }

    #[DataProvider('races')]
    public function test_actual_processes_serialize_readings_and_price_snapshots(string $otherAction): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasColumn('utility_prices', 'building_id'));
        $this->assertFalse(Schema::hasColumn('meter_readings', 'final_contract_id'));
        $this->assertSame(0, DB::table('utility_prices')->count());
        $u1 = require database_path('migrations/pending/2026_10_27_000002_scope_utility_prices_to_buildings.php');
        $u3 = require database_path('migrations/pending/2026_10_28_000001_scope_final_meter_readings_to_contracts.php');
        $u1Applied = false;
        $u3Applied = false;
        $createdService = false;
        $service = $building = $room = $tenant = $contract = null;
        $processes = [];
        try {
            $u1->up();
            $u1Applied = true;
            $u3->up();
            $u3Applied = true;
            $service = Service::where('code', 'ELECTRICITY')->first();
            if (! $service) {
                $service = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
                $createdService = true;
            }
            $this->assertTrue($service->isMetered() && $service->status === ServiceStatus::Active);
            $building = Building::factory()->create();
            $room = Room::factory()->create(['building_id' => $building->id]);
            $tenant = User::factory()->create();
            $contract = Contract::factory()->active()->create(['room_id' => $room->id, 'user_id' => $tenant->id]);
            $contract->contractServices()->create(['service_id' => $service->id, 'quantity' => '1.00', 'unit_price' => null, 'start_date' => '2026-10-01']);
            DB::table('utility_prices')->insert(['building_id' => $building->id, 'service_id' => $service->id, 'unit_price' => 3500, 'effective_from' => '2026-09-01']);
            $entry = ['room_id' => $room->id, 'service_id' => $service->id, 'period' => '2026-10-01', 'reading_date' => '2026-11-01', 'current_reading' => '112.35'];
            $actions = [['job' => 'first', 'action' => 'reading', 'data' => $entry], ['job' => 'second', 'action' => $otherAction, 'data' => $otherAction === 'reading' ? $entry
                : ['building_id' => $building->id, 'service_id' => $service->id, 'unit_price' => 4000, 'effective_from' => '2026-10-01']]];
            DB::beginTransaction();
            Service::whereKey($service->id)->lockForUpdate()->firstOrFail();
            foreach ($actions as $input) {
                $process = new Process([PHP_BINARY, base_path('tests/Support/RunMeterAction.php'), json_encode($input, JSON_THROW_ON_ERROR)], base_path(), ['DB_CONNECTION' => 'mysql_test', 'APP_ENV' => 'testing']);
                $process->setTimeout(30);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 10;
            while (count(array_filter($processes, fn ($process) => str_contains($process->getOutput(), "READY\n"))) !== 2) {
                if (microtime(true) >= $deadline) {
                    $this->fail('Children did not reach the ready barrier.');
                }
                usleep(10000);
            }
            foreach ($processes as $process) {
                $this->assertTrue($process->isRunning(), 'A child completed while the parent still held the service lock.');
            }
            DB::commit();
            $results = [];
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), $process->getErrorOutput().$process->getOutput());
                $lines = explode("\n", trim($process->getOutput()));
                $payload = json_decode(end($lines), true, flags: JSON_THROW_ON_ERROR);
                $results[$payload['job']] = $payload;
            }
            $reading = MeterReading::where('room_id', $room->id)->sole();
            if ($otherAction === 'reading') {
                $statuses = array_column($results, 'status');
                sort($statuses);
                $this->assertSame([201, 409], $statuses);
                $this->assertSame(3500, $reading->unit_price);
            } else {
                $this->assertSame('reading', $results['first']['action']);
                $this->assertSame('price', $results['second']['action']);
                $this->assertSame(201, $results['first']['status']);
                $this->assertContains($results['second']['status'], [201, 422]);
                $this->assertSame($results['second']['status'] === 201 ? 4000 : 3500, $reading->unit_price);
                $this->assertSame($results['second']['status'] === 201 ? 49400 : 43225, $reading->amount);
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
            if ($room) {
                DB::table('meter_readings')->where('room_id', $room->id)->delete();
            }
            if ($contract) {
                DB::table('contract_services')->where('contract_id', $contract->id)->delete();
                DB::table('contracts')->where('id', $contract->id)->delete();
            }
            if ($room) {
                $room->delete();
            }
            if ($building) {
                DB::table('utility_prices')->where('building_id', $building->id)->delete();
                $building->delete();
            }
            if ($tenant) {
                $tenant->delete();
            }
            if ($createdService) {
                $service->delete();
            }
            if ($u3Applied) {
                $u3->down();
            }
            if ($u1Applied) {
                $u1->down();
            }
        }
    }
}
