<?php

/** Scoped MTR browser/live-API fixtures, never shared dev data; explicit pending DDL owner. */

use App\Enums\UserRole;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractService;
use App\Services\ContractTermsService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

if (PHP_SAPI !== 'cli') {
    throw new RuntimeException('CLI only.');
}
chdir(dirname(__DIR__, 2));
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
TestCase::ensureSafeTestDatabase($app->make(Repository::class));
$identity = DB::selectOne('SELECT DATABASE() AS db, CURRENT_USER() AS account');
if ($identity->db !== 'mini_apartment_test' || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Wrong test identity.');
}
$file = $argv[2] ?? throw new RuntimeException('Manifest path required.');
$u1 = require database_path('migrations/pending/2026_10_27_000002_scope_utility_prices_to_buildings.php');
$u3 = require database_path('migrations/pending/2026_10_28_000001_scope_final_meter_readings_to_contracts.php');
$writeManifest = static function (array $data) use ($file): void {
    $json = json_encode($data, JSON_THROW_ON_ERROR);
    $temporary = $file.'.'.$data['run'].'.tmp';
    $handle = fopen($temporary, 'x');
    if ($handle === false) {
        throw new RuntimeException('Cannot create private manifest checkpoint.');
    }
    try {
        chmod($temporary, 0600);
        if (fwrite($handle, $json) !== strlen($json) || ! fflush($handle)) {
            throw new RuntimeException('Cannot write complete fixture manifest.');
        }
    } finally {
        fclose($handle);
    }
    if (! rename($temporary, $file)) {
        throw new RuntimeException('Cannot publish fixture manifest checkpoint.');
    }
};
if (($argv[1] ?? '') === 'setup') {
    if (is_file($file) || Schema::hasColumn('utility_prices', 'building_id') || Schema::hasColumn('meter_readings', 'final_contract_id')
        || DB::table('utility_prices')->exists() || DB::table('meter_readings')->exists()) {
        throw new RuntimeException('Another schema/data owner exists; stop without changes.');
    }
    $data = ['run' => bin2hex(random_bytes(6)), 'phase' => 'before_schema'];
    $data['prefix'] = 'MTR '.$data['run'];
    $writeManifest($data);
    $u1->up();
    $data['phase'] = 'u1_applied';
    $writeManifest($data);
    $u3->up();
    $data['phase'] = 'schema_ready';
    $writeManifest($data);
    $data = DB::transaction(function () use ($data, $writeManifest): array {
        $data['created_services'] = [];
        foreach (['ELECTRICITY' => 'kWh', 'WATER' => 'm3'] as $code => $unit) {
            $service = Service::where('code', $code)->first();
            if (! $service) {
                $service = Service::factory()->metered($code, $unit)->create(['name' => $data['prefix'].' '.$code]);
                $data['created_services'][] = $service->id;
            }
            $data['services'][$code] = $service->id;
        }
        foreach (UserRole::cases() as $role) {
            $password = bin2hex(random_bytes(16));
            $user = User::factory()->role($role)->create(['full_name' => $data['prefix'].' '.$role->value, 'password' => $password]);
            $data['users'][$role->value] = ['id' => $user->id, 'phone' => $user->phone, 'password' => $password];
        }
        foreach (['a', 'b', 'missing_price'] as $key) {
            $building = Building::factory()->create(['name' => $data['prefix'].' '.$key]);
            $data['buildings'][$key] = $building->id;
            if ($key !== 'missing_price') {
                foreach ($data['services'] as $code => $serviceId) {
                    DB::table('utility_prices')->insert(['building_id' => $building->id, 'service_id' => $serviceId,
                        'unit_price' => $code === 'ELECTRICITY' ? ($key === 'a' ? 3500 : 4200) : ($key === 'a' ? 15000 : 16000),
                        'effective_from' => '2025-01-01']);
                }
            }
        }
        $slots = ['history', 'ui_batch_1', 'ui_batch_2', 'api_validation', 'api_race', 'api_flow'];
        for ($index = 1; $index <= 23; $index++) {
            $key = $slots[$index - 1] ?? ($index === 23 ? 'ui_single' : 'empty_'.$index);
            $data['rooms'][$key] = Room::factory()->create(['building_id' => $data['buildings']['a'], 'code' => $data['run'].'-A'.str_pad((string) $index, 2, '0', STR_PAD_LEFT), 'max_occupants' => 3])->id;
        }
        foreach (['api_flow_b' => 'b', 'missing_price' => 'missing_price'] as $key => $buildingKey) {
            $data['rooms'][$key] = Room::factory()->create(['building_id' => $data['buildings'][$buildingKey], 'code' => $data['run'].'-'.$key, 'max_occupants' => 3])->id;
        }
        $actor = User::findOrFail($data['users']['admin']['id']);
        foreach (['history', 'ui_single', 'ui_batch_1', 'ui_batch_2', 'api_validation', 'api_race', 'api_flow', 'api_flow_b', 'missing_price'] as $key) {
            $tenant = User::factory()->create(['full_name' => $data['prefix'].' tenant '.$key]);
            $data['tenants'][] = $tenant->id;
            $contract = Contract::factory()->create(['room_id' => $data['rooms'][$key], 'user_id' => $tenant->id,
                'start_date' => $key === 'history' ? '2025-01-01' : '2026-10-01', 'end_date' => '2027-09-30', 'deposit_amount' => 0]);
            app(ContractTermsService::class)->updateDraft($contract, $actor, ['early_termination_fee_type' => 'none', 'early_termination_fee_amount' => null,
                'early_termination_fee_multiplier' => null, 'early_termination_waiver_conditions' => []]);
            $data['contracts'][$key] = $contract->id;
            if ($key !== 'ui_single') {
                $current = app(ContractService::class)->find($contract->id);
                app(ContractService::class)->activate($current, $actor, ['expected_revision' => $current->lifecycleRevision(),
                    'initial_electricity_reading' => '100.00', 'initial_water_reading' => '10.00', 'meter_gap_confirmed' => false]);
            }
        }
        for ($index = 0; $index < 21; $index++) {
            $period = CarbonImmutable::parse('2025-01-01')->addMonths($index);
            DB::table('meter_readings')->insert(['room_id' => $data['rooms']['history'], 'contract_id' => $data['contracts']['history'],
                'service_id' => $data['services']['ELECTRICITY'], 'kind' => 'periodic', 'period' => $period->format('Y-m-d'),
                'reading_date' => $period->addMonth()->format('Y-m-d'), 'previous_reading' => (string) (100 + $index), 'current_reading' => (string) (101 + $index),
                'consumption' => '1.00', 'unit_price' => 3500, 'amount' => 3500, 'created_at' => now(), 'updated_at' => now()]);
        }
        $data['phase'] = 'fixtures_ready';
        $writeManifest($data); // Persist exact owned IDs before committing fixture data.

        return $data;
    });
    echo "MTR scoped fixtures ready\n";
} elseif (($argv[1] ?? '') === 'cleanup') {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (($data['phase'] ?? '') !== 'fixtures_ready') {
        throw new RuntimeException('Inspect partial setup before cleanup.');
    }
    DB::transaction(function () use ($data): void {
        $buildings = array_values($data['buildings']);
        $rooms = array_values($data['rooms']);
        $contracts = array_values($data['contracts']);
        $users = [...array_column($data['users'], 'id'), ...$data['tenants']];
        foreach ($data['created_services'] as $id) {
            $service = Service::find($id);
            if (! $service || ! isset($data['services'][$service->code]) || $data['services'][$service->code] !== $id
                || $service->name !== $data['prefix'].' '.$service->code) {
                throw new RuntimeException('Created service identity changed; stop without deleting.');
            }
        }
        if (Building::whereIn('id', $buildings)->where('name', 'like', $data['prefix'].'%')->count() !== count($buildings)
            || User::whereIn('id', $users)->where('full_name', 'like', $data['prefix'].'%')->count() !== count($users)
            || Room::whereIn('id', $rooms)->whereIn('building_id', $buildings)->count() !== count($rooms)
            || Contract::withTrashed()->whereIn('id', $contracts)->whereIn('room_id', $rooms)->whereIn('user_id', $data['tenants'])->count() !== count($contracts)
            || Room::whereIn('building_id', $buildings)->whereNotIn('id', $rooms)->exists()
            || Contract::withTrashed()->whereIn('room_id', $rooms)->whereNotIn('id', $contracts)->exists()
            || Contract::withTrashed()->whereIn('user_id', $data['tenants'])->whereNotIn('id', $contracts)->exists()
            || DB::table('contract_services')->whereIn('service_id', $data['created_services'])->whereNotIn('contract_id', $contracts)->exists()
            || DB::table('meter_readings')->whereNotIn('room_id', $rooms)->exists()
            || DB::table('meter_readings')->whereIn('room_id', $rooms)->whereNotNull('contract_id')->whereNotIn('contract_id', $contracts)->exists()
            || DB::table('invoices')->whereIn('contract_id', $contracts)->exists()
            || DB::table('meter_readings')->whereIn('room_id', $rooms)->whereNotNull('invoice_id')->exists()
            || DB::table('utility_prices')->whereNotIn('building_id', $buildings)->exists()) {
            throw new RuntimeException('Changed identity/unowned financial history; stop without deleting.');
        }
        DB::table('meter_readings')->whereIn('room_id', $rooms)->delete();
        DB::table('contract_services')->whereIn('contract_id', $contracts)->delete();
        DB::table('contracts')->whereIn('id', $contracts)->delete();
        DB::table('rooms')->whereIn('id', $rooms)->delete();
        DB::table('utility_prices')->whereIn('building_id', $buildings)->delete();
        DB::table('buildings')->whereIn('id', $buildings)->delete();
        DB::table('sessions')->whereIn('user_id', $users)->delete();
        DB::table('users')->whereIn('id', $users)->delete();
        DB::table('services')->whereIn('id', $data['created_services'])->delete();
    });
    $u3->down();
    $u1->down();
    unlink($file);
    echo "MTR fixture IDs cleaned and original test schema restored\n";
} else {
    throw new RuntimeException('Unknown action.');
}
