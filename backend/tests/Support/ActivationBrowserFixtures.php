<?php

/** Disposable fixtures for LEASE-C only; never bootstrap or clean a development database. */

use App\Enums\UserRole;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

if (PHP_SAPI !== 'cli') {
    throw new RuntimeException('Chỉ chạy CLI trên DB test.');
}
chdir(dirname(__DIR__, 2));
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
TestCase::ensureSafeTestDatabase($app->make(Repository::class));
$identity = DB::selectOne('SELECT DATABASE() AS db, CURRENT_USER() AS account');
if ($identity->db !== 'mini_apartment_test' || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Sai DB/tài khoản test.');
}
$file = $argv[2] ?? throw new RuntimeException('Cần manifest ngoài source.');
if (($argv[1] ?? '') === 'setup') {
    if (is_file($file)) {
        throw new RuntimeException('Manifest đã tồn tại; không ghi đè.');
    }
    $data = DB::transaction(function (): array {
        $run = bin2hex(random_bytes(6));
        $prefix = 'LEASE-C '.$run;
        $data = ['run' => $run, 'prefix' => $prefix, 'users' => [], 'contracts' => [], 'rooms' => [], 'created_services' => []];
        foreach (['ELECTRICITY' => 'kWh', 'WATER' => 'm3'] as $code => $unit) {
            if (! Service::where('code', $code)->exists()) {
                $data['created_services'][] = Service::factory()->metered($code, $unit)->create()->id;
            }
        }
        foreach (UserRole::cases() as $role) {
            $password = bin2hex(random_bytes(16));
            $user = User::factory()->role($role)->create(['full_name' => $prefix.' '.$role->value, 'password' => $password]);
            $data['users'][$role->value] = ['id' => $user->id, 'phone' => $user->phone, 'password' => $password];
        }
        $building = Building::factory()->create(['name' => $prefix]);
        $data['building_id'] = $building->id;
        foreach (['zero' => 0, 'positive' => 2000000, 'api' => 1000000, 'validation' => 1000000] as $key => $deposit) {
            $room = Room::factory()->create(['building_id' => $building->id, 'code' => $run.'-'.$key, 'max_occupants' => 3]);
            $tenant = User::factory()->create(['full_name' => $prefix.' tenant '.$key]);
            $contract = Contract::factory()->create(['room_id' => $room->id, 'user_id' => $tenant->id, 'deposit_amount' => $deposit]);
            $data['rooms'][] = $room->id;
            $data['tenants'][] = $tenant->id;
            $data['contracts'][$key] = $contract->id;
        }

        return $data;
    });
    if (file_put_contents($file, json_encode($data, JSON_THROW_ON_ERROR)) === false) {
        throw new RuntimeException('Không ghi được manifest.');
    }
    echo "Created LEASE-C scoped fixtures\n";
} elseif (($argv[1] ?? '') === 'cleanup') {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    DB::transaction(function () use ($data): void {
        $contracts = array_values($data['contracts']);
        $users = array_merge(array_column($data['users'], 'id'), $data['tenants']);
        if (Building::whereKey($data['building_id'])->value('name') !== $data['prefix']
            || User::whereIn('id', $users)->where('full_name', 'like', $data['prefix'].'%')->count() !== count($users)
            || Contract::withTrashed()->whereIn('id', $contracts)->whereIn('room_id', $data['rooms'])->whereIn('user_id', $data['tenants'])->count() !== count($contracts)) {
            throw new RuntimeException('Fixture identity changed; stop without cleanup.');
        }
        foreach (['invoices', 'meter_readings'] as $table) {
            if (DB::table($table)->whereIn('contract_id', $contracts)->exists()) {
                throw new RuntimeException('Unexpected financial/reading history; inspect before cleanup.');
            }
        }
        if (Contract::withTrashed()->whereIn('room_id', $data['rooms'])->whereNotIn('id', $contracts)->exists()) {
            throw new RuntimeException('Unowned contracts found in fixture rooms.');
        }
        DB::table('contract_services')->whereIn('contract_id', $contracts)->delete();
        DB::table('contracts')->whereIn('id', $contracts)->delete();
        DB::table('rooms')->whereIn('id', $data['rooms'])->delete();
        DB::table('buildings')->where('id', $data['building_id'])->delete();
        DB::table('sessions')->whereIn('user_id', $users)->delete();
        DB::table('users')->whereIn('id', $users)->delete();
        foreach ($data['created_services'] as $id) {
            if (DB::table('contract_services')->where('service_id', $id)->exists() || DB::table('meter_readings')->where('service_id', $id)->exists()) {
                throw new RuntimeException('Fixture service has unowned history.');
            }
            DB::table('services')->where('id', $id)->delete();
        }
    });
    unlink($file);
    echo "Cleaned exact LEASE-C fixtures; no reset\n";
} else {
    throw new RuntimeException('Unknown action.');
}
