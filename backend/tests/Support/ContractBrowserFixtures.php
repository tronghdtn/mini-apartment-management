<?php

/** CLI fixtures cho browser Hợp đồng; không phải API hoặc seeder dev. */

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

if (PHP_SAPI !== 'cli') {
    throw new RuntimeException('Chỉ chạy CLI trên DB test riêng.');
}
chdir(dirname(__DIR__, 2));
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
TestCase::ensureSafeTestDatabase($app->make(Repository::class));
$identity = DB::selectOne('SELECT DATABASE() AS db, CURRENT_USER() AS account');
if ($identity->db !== TestCase::TEST_DATABASE || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Sai DB hoặc tài khoản test.');
}
$file = $argv[2] ?? throw new RuntimeException('Cần đường dẫn fixture ngoài repository.');
if (($argv[1] ?? '') === 'setup') {
    if (is_file($file)) {
        throw new RuntimeException('File đã tồn tại; chọn lượt mới, không ghi đè.');
    }
    $run = bin2hex(random_bytes(4));
    $data = DB::transaction(function () use ($run): array {
        $building = Building::factory()->create(['name' => 'CTRDraft '.$run, 'total_floors' => 3]);
        $result = ['run' => $run, 'building_id' => $building->id, 'rooms' => [], 'tenants' => []];
        for ($i = 0; $i < 23; $i++) {
            $room = Room::factory()->create(['building_id' => $building->id, 'code' => 'CTR-'.$run.'-'.$i, 'floor_number' => 1, 'base_price' => 3100000, 'deposit_amount' => 3100000, 'max_occupants' => 3]);
            $result['rooms'][] = ['id' => $room->id, 'code' => $room->code];
        }
        $base = random_int(100000, 899999);
        $hash = Hash::make(bin2hex(random_bytes(16)));
        for ($i = 0; $i < 44; $i++) {
            $user = new User(['full_name' => 'CTRDraft '.$run.' Tenant '.$i, 'phone' => '09'.($base * 100 + $i), 'email' => null, 'password' => $hash]);
            $user->role = $i < 22 ? UserRole::User : UserRole::Resident;
            $user->status = UserStatus::Active;
            $user->save();
            $result['tenants'][] = ['id' => $user->id, 'name' => $user->full_name];
        }

        return $result;
    });
    if (file_put_contents($file, json_encode($data, JSON_THROW_ON_ERROR)) === false) {
        throw new RuntimeException('Không ghi được fixture.');
    }
    echo "Created guarded contract fixtures; no credentials printed.\n";
} elseif (($argv[1] ?? '') === 'cleanup') {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (! preg_match('/^[a-f0-9]{8}$/D', $data['run'] ?? '')) {
        throw new RuntimeException('Sai mã lượt test.');
    }
    DB::transaction(function () use ($data): void {
        $roomIds = array_column($data['rooms'], 'id');
        $userIds = array_column($data['tenants'], 'id');
        $building = Building::whereKey($data['building_id'])->where('name', 'CTRDraft '.$data['run'])->firstOrFail();
        if (Room::where('building_id', $building->id)->whereIn('id', $roomIds)->count() !== 23 || User::whereIn('id', $userIds)->where('full_name', 'like', 'CTRDraft '.$data['run'].' Tenant %')->count() !== 44) {
            throw new RuntimeException('Fixture identity/count không khớp; không cleanup.');
        }
        $contracts = Contract::withTrashed()->whereIn('room_id', $roomIds)->get();
        foreach ($contracts as $contract) {
            if (! in_array($contract->user_id, $userIds, true) || $contract->status->value !== 'draft') {
                throw new RuntimeException('Hợp đồng ngoài phạm vi nháp fixture; không cleanup.');
            }
            foreach (['contract_occupants', 'contract_services', 'meter_readings', 'invoices'] as $table) {
                if (Schema::hasTable($table) && DB::table($table)->where('contract_id', $contract->id)->exists()) {
                    throw new RuntimeException('Fixture có lịch sử liên quan; không cleanup tự động.');
                }
            }
        }
        DB::table('contracts')->whereIn('id', $contracts->modelKeys())->delete();
        DB::table('sessions')->whereIn('user_id', $userIds)->delete();
        User::whereIn('id', $userIds)->delete();
        Room::whereIn('id', $roomIds)->where('building_id', $building->id)->delete();
        $building->delete();
    });
    echo "Removed only matching contract test fixtures.\n";
} else {
    throw new RuntimeException('Dùng setup hoặc cleanup với đường dẫn fixture.');
}
