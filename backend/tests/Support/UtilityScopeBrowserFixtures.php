<?php

/** U1 browser data and schema belong to one explicitly guarded test run. */

use App\Enums\UserRole;
use App\Models\Building;
use App\Models\Service;
use App\Models\User;
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
$migration = require database_path('migrations/pending/2026_10_27_000002_scope_utility_prices_to_buildings.php');
if (($argv[1] ?? '') === 'setup') {
    if (is_file($file) || Schema::hasColumn('utility_prices', 'building_id') || DB::table('utility_prices')->exists()) {
        throw new RuntimeException('Another schema/data owner exists; stop without changes.');
    }
    $run = bin2hex(random_bytes(6));
    $data = ['run' => $run, 'prefix' => 'U1 '.$run, 'phase' => 'before_schema'];
    file_put_contents($file, json_encode($data, JSON_THROW_ON_ERROR));
    $migration->up();
    $data['phase'] = 'schema_ready';
    file_put_contents($file, json_encode($data, JSON_THROW_ON_ERROR));
    $data = DB::transaction(function () use ($data): array {
        $data['created_services'] = [];
        foreach (['ELECTRICITY' => 'kWh', 'WATER' => 'm3'] as $code => $unit) {
            $service = Service::where('code', $code)->first();
            if (! $service) {
                $service = Service::factory()->metered($code, $unit)->create();
                $data['created_services'][] = $service->id;
            }
            $data['services'][$code] = $service->id;
        }
        foreach (UserRole::cases() as $role) {
            $password = bin2hex(random_bytes(16));
            $user = User::factory()->role($role)->create(['full_name' => $data['prefix'].' '.$role->value, 'password' => $password]);
            $data['users'][$role->value] = ['id' => $user->id, 'phone' => $user->phone, 'password' => $password];
        }
        for ($index = 1; $index <= 23; $index++) {
            $building = Building::factory()->create(['name' => $data['prefix'].' '.str_pad((string) $index, 2, '0', STR_PAD_LEFT)]);
            $data['buildings'][] = ['id' => $building->id, 'name' => $building->name];
        }
        $data['ui_building_id'] = $data['buildings'][22]['id'];
        $data['api_building_id'] = $data['buildings'][21]['id'];
        foreach (range(0, 20) as $month) {
            DB::table('utility_prices')->insert(['building_id' => $data['buildings'][0]['id'], 'service_id' => $data['services']['ELECTRICITY'],
                'effective_from' => (new DateTimeImmutable('2020-01-01'))->modify('+'.$month.' months')->format('Y-m-d'),
                'unit_price' => 3000 + $month, 'created_at' => now(), 'updated_at' => now()]);
        }
        $data['phase'] = 'fixtures_ready';

        return $data;
    });
    file_put_contents($file, json_encode($data, JSON_THROW_ON_ERROR));
    echo "U1 schema and scoped fixtures ready\n";
} elseif (($argv[1] ?? '') === 'cleanup') {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (($data['phase'] ?? '') !== 'fixtures_ready') {
        throw new RuntimeException('Inspect partial setup before cleanup.');
    }
    DB::transaction(function () use ($data): void {
        $ids = array_column($data['buildings'], 'id');
        $users = array_column($data['users'], 'id');
        if (Building::whereIn('id', $ids)->where('name', 'like', $data['prefix'].'%')->count() !== count($ids)
            || User::whereIn('id', $users)->where('full_name', 'like', $data['prefix'].'%')->count() !== count($users)
            || DB::table('rooms')->whereIn('building_id', $ids)->exists()
            || DB::table('utility_prices')->whereNotIn('building_id', $ids)->exists()) {
            throw new RuntimeException('Unowned history or changed identity; stop without deleting.');
        }
        DB::table('utility_prices')->whereIn('building_id', $ids)->delete();
        DB::table('buildings')->whereIn('id', $ids)->delete();
        DB::table('sessions')->whereIn('user_id', $users)->delete();
        DB::table('users')->whereIn('id', $users)->delete();
        DB::table('services')->whereIn('id', $data['created_services'])->delete();
    });
    if (DB::table('utility_prices')->exists()) {
        throw new RuntimeException('Prices remain; do not restore global schema.');
    }
    $migration->down();
    unlink($file);
    echo "U1 fixtures cleaned; original global test schema restored\n";
} else {
    throw new RuntimeException('Unknown action.');
}
