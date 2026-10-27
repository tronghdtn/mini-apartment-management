<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/** Independent PHP processes must serialize on the actual room/tenant locks; no RefreshDatabase. */
class ContractActivationConcurrencyTest extends TestCase
{
    public static function conflicts(): array
    {
        return ['same room' => [true], 'same tenant' => [false]];
    }

    #[DataProvider('conflicts')]
    public function test_only_one_concurrent_activation_succeeds(bool $sameRoom): void
    {
        Artisan::call('migrate', ['--force' => true]);
        $building = Building::factory()->create();
        $rooms = Room::factory()->count(2)->create(['building_id' => $building->id]);
        $users = User::factory()->count(2)->create();
        $actor = User::factory()->role(UserRole::Admin)->create();
        $createdServices = [];
        foreach (['ELECTRICITY' => 'kWh', 'WATER' => 'm3'] as $code => $unit) {
            if (! Service::where('code', $code)->exists()) {
                $createdServices[] = Service::factory()->metered($code, $unit)->create()->id;
            }
        }
        $a = Contract::factory()->create(['room_id' => $rooms[0]->id, 'user_id' => $users[0]->id, 'deposit_amount' => 0, 'early_termination_fee_type' => 'none']);
        $b = Contract::factory()->create(['room_id' => $sameRoom ? $rooms[0]->id : $rooms[1]->id, 'user_id' => $sameRoom ? $users[1]->id : $users[0]->id, 'deposit_amount' => 0, 'early_termination_fee_type' => 'none']);
        $processes = [];
        try {
            DB::beginTransaction();
            if ($sameRoom) {
                Room::whereKey($rooms[0]->id)->lockForUpdate()->firstOrFail();
            } else {
                User::whereKey($users[0]->id)->lockForUpdate()->firstOrFail();
            }
            foreach ([$a, $b] as $draft) {
                $input = ['id' => $draft->id, 'actor' => $actor->id, 'data' => [
                    'initial_electricity_reading' => '1.00', 'initial_water_reading' => '2.00', 'meter_gap_confirmed' => false,
                    'expected_revision' => app(ContractService::class)->find($draft->id)->lifecycleRevision(),
                ]];
                $process = new Process([PHP_BINARY, base_path('tests/Support/RunContractActivation.php'), json_encode($input, JSON_THROW_ON_ERROR)], base_path(), ['DB_CONNECTION' => 'mysql_test', 'APP_ENV' => 'testing']);
                $process->setTimeout(30);
                $process->start();
                $processes[] = $process;
            }
            usleep(300000);
            DB::commit();
            $statuses = [];
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), $process->getErrorOutput().$process->getOutput());
                $statuses[] = trim($process->getOutput());
            }
            sort($statuses);
            $this->assertSame(['200', '409'], $statuses);
            $this->assertSame(1, Contract::whereIn('id', [$a->id, $b->id])->where('status', 'active')->count());
            $this->assertSame(2, DB::table('contract_services')->whereIn('contract_id', [$a->id, $b->id])->count());
        } finally {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
            DB::table('contract_services')->whereIn('contract_id', [$a->id, $b->id])->delete();
            DB::table('contracts')->whereIn('id', [$a->id, $b->id])->delete();
            DB::table('rooms')->whereIn('id', $rooms->modelKeys())->delete();
            DB::table('buildings')->where('id', $building->id)->delete();
            DB::table('users')->whereIn('id', [...$users->modelKeys(), $actor->id])->delete();
            DB::table('services')->whereIn('id', $createdServices)->delete();
        }
    }
}
