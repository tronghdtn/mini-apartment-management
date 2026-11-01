<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Building;
use App\Models\Contract;
use App\Models\ContractOccupant;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractOccupantService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/** Dữ liệu đã commit để hai tiến trình dùng khóa MySQL thật; không RefreshDatabase. */
class ContractOccupantConcurrencyTest extends TestCase
{
    public static function races(): array
    {
        return ['two occupant submissions' => ['store'], 'occupant versus activation' => ['activate']];
    }

    #[DataProvider('races')]
    public function test_two_real_writers_preserve_capacity_revision_and_contract_lifecycle(string $secondMode): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        foreach (['users', 'rooms', 'buildings', 'contracts', 'contract_occupants', 'services', 'contract_services'] as $table) {
            $this->assertSame(0, DB::table($table)->count());
        }
        $actor = User::factory()->role(UserRole::Admin)->create();
        $tenant = User::factory()->create();
        $room = Room::factory()->create(['max_occupants' => 2]);
        $contract = Contract::factory()->create(['room_id' => $room->id, 'user_id' => $tenant->id,
            'occupant_count' => 2, 'deposit_amount' => 0, 'early_termination_fee_type' => 'none']);
        $serviceIds = [];
        if ($secondMode === 'activate') {
            $serviceIds[] = Service::factory()->metered('ELECTRICITY', 'kWh')->create()->id;
            $serviceIds[] = Service::factory()->metered('WATER', 'm3')->create()->id;
        }
        $processes = [];
        $ready = [];
        try {
            $revision = app(ContractOccupantService::class)->read((string) $contract->id, $actor)['revision'];
            DB::beginTransaction();
            Room::whereKey($room->id)->lockForUpdate()->firstOrFail();
            foreach ([1, 2] as $index) {
                $ready[$index] = storage_path('framework/testing/occupant-race-'.bin2hex(random_bytes(8)));
                $payload = ['actor' => $actor->id, 'contract' => $contract->id, 'revision' => $revision, 'ready' => $ready[$index],
                    'mode' => $index === 2 ? $secondMode : 'store', 'lifecycle_revision' => $contract->fresh()->lifecycleRevision()];
                $process = new Process([PHP_BINARY, base_path('tests/Support/contract_occupant_worker.php'), json_encode($payload)], base_path(),
                    ['APP_ENV' => 'testing', 'DB_CONNECTION' => self::TEST_CONNECTION, 'DB_DATABASE' => self::TEST_DATABASE, 'DB_URL' => '', 'RUN_MIGRATIONS' => 'false']);
                $process->setTimeout(35);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 15;
            while ((! is_file($ready[1]) || ! is_file($ready[2])) && microtime(true) < $deadline) {
                usleep(10000);
            }
            $this->assertFileExists($ready[1]);
            $this->assertFileExists($ready[2]);
            DB::commit();
            $statuses = [];
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), 'Occupant worker failed; output withheld.');
                $statuses[] = json_decode($process->getOutput(), true, 512, JSON_THROW_ON_ERROR)['status'];
            }
            sort($statuses);
            $this->assertContains($statuses, $secondMode === 'store' ? [[201, 409]] : [[200, 409], [201, 409]]);
            $activated = $contract->fresh()->status->value === 'active';
            $this->assertSame($activated ? 0 : 1, $contract->occupants()->count());
            $this->assertSame(2, $contract->fresh()->occupant_count);
            $this->assertSame($activated ? 2 : 0, DB::table('contract_services')->count());
            $this->assertSame($activated ? 'occupied' : 'available', $room->fresh()->status->value);
            $this->assertSame($activated ? 'resident' : 'user', $tenant->fresh()->role->value);
        } finally {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
            foreach ($ready as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
            ContractOccupant::where('contract_id', $contract->id)->delete();
            DB::table('contract_services')->where('contract_id', $contract->id)->delete();
            Contract::whereKey($contract->id)->forceDelete();
            Room::whereKey($room->id)->delete();
            Building::whereKey($room->building_id)->delete();
            User::whereIn('id', [$actor->id, $tenant->id])->delete();
            Service::whereIn('id', $serviceIds)->delete();
        }
    }
}
