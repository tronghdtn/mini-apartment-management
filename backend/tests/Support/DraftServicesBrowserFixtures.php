<?php

/** Fixture CLI cho kiểm thử trình duyệt; không phải API/seeder hoặc quy trình kích hoạt. */

use App\Enums\ServiceBillingType;
use App\Enums\ServiceStatus;
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
if ($identity->db !== TestCase::TEST_DATABASE || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Sai DB/account test.');
}
$mode = $argv[1] ?? '';
$file = $argv[2] ?? throw new RuntimeException('Thiếu đường dẫn fixture.');
if ($mode === 'setup') {
    if (is_file($file)) {
        throw new RuntimeException('Không ghi đè fixture cũ.');
    }
    $data = DB::transaction(function (): array {
        $run = bin2hex(random_bytes(4));
        $prefix = 'ServicesBrowser '.$run;
        $building = Building::factory()->create(['name' => $prefix, 'total_floors' => 2]);
        $rooms = Room::factory()->count(2)->create(['building_id' => $building->id, 'max_occupants' => 3]);
        $users = [];
        foreach (['admin', 'guard', 'user'] as $role) {
            $users[$role] = User::factory()->role(UserRole::from($role))->create([
                'full_name' => $prefix.' '.$role, 'email' => $run.'-'.$role.'@example.test', 'password' => 'Services Browser Test!42',
            ]);
        }
        $draft = Contract::factory()->create(['room_id' => $rooms[0]->id, 'user_id' => $users['user']->id, 'occupant_count' => 2]);
        $active = Contract::factory()->active()->create(['room_id' => $rooms[1]->id, 'user_id' => $users['user']->id]);
        $services = [];
        for ($i = 0; $i < 23; $i++) {
            $services[] = Service::factory()->create([
                'code' => 'SB_'.$run.'_'.$i, 'name' => $prefix.' Service '.$i,
                'billing_type' => $i === 0 ? ServiceBillingType::PerRoom : ($i === 1 ? ServiceBillingType::PerPerson : ServiceBillingType::PerUnit),
                'price' => 123456, 'status' => $i === 21 ? ServiceStatus::Inactive : ServiceStatus::Active,
            ])->id;
        }
        $active->contractServices()->create(['service_id' => $services[21], 'quantity' => 1, 'unit_price' => 65432, 'start_date' => $active->start_date->format('Y-m-d')]);

        return ['run' => $run, 'building_id' => $building->id, 'rooms' => $rooms->modelKeys(),
            'users' => array_map(fn (User $user) => ['id' => $user->id, 'email' => $user->email], $users),
            'contracts' => [$draft->id, $active->id], 'services' => $services];
    });
    if (file_put_contents($file, json_encode($data, JSON_THROW_ON_ERROR)) === false) {
        throw new RuntimeException('Không ghi được file fixture.');
    }
    echo "Fixture test đã tạo; không in mật khẩu/cookie.\n";
} else {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (! preg_match('/^[a-f0-9]{8}$/D', $data['run'] ?? '')) {
        throw new RuntimeException('Sai mã lượt.');
    }
    $prefix = 'ServicesBrowser '.$data['run'];
    if (Building::whereKey($data['building_id'])->where('name', $prefix)->count() !== 1
        || Service::whereIn('id', $data['services'])->where('name', 'like', $prefix.' Service %')->count() !== 23
        || User::whereIn('id', array_column($data['users'], 'id'))->where('full_name', 'like', $prefix.' %')->count() !== 3) {
        throw new RuntimeException('Fixture identity không khớp; dừng.');
    }
    if ($mode === 'reprice') {
        Service::whereKey($data['services'][1])->update(['price' => 234567]);
        echo "Đã đổi giá danh mục fixture, chưa sửa snapshot.\n";
    } elseif ($mode === 'cleanup') {
        DB::transaction(function () use ($data): void {
            $contracts = Contract::withTrashed()->whereIn('id', $data['contracts'])->get();
            foreach ($contracts as $contract) {
                if (! in_array($contract->room_id, $data['rooms'], true) || $contract->user_id !== $data['users']['user']['id']) {
                    throw new RuntimeException('Hợp đồng ngoài fixture.');
                }
                foreach (['invoices', 'meter_readings', 'contract_occupants'] as $table) {
                    if (DB::table($table)->where('contract_id', $contract->id)->exists()) {
                        throw new RuntimeException('Fixture có lịch sử khác; dừng cleanup.');
                    }
                }
            }
            DB::table('contract_services')->whereIn('contract_id', $data['contracts'])->delete();
            DB::table('contracts')->whereIn('id', $data['contracts'])->delete();
            DB::table('sessions')->whereIn('user_id', array_column($data['users'], 'id'))->delete();
            User::whereIn('id', array_column($data['users'], 'id'))->delete();
            Room::whereIn('id', $data['rooms'])->where('building_id', $data['building_id'])->delete();
            Building::whereKey($data['building_id'])->delete();
            Service::whereIn('id', $data['services'])->delete();
        });
        echo "Đã dọn đúng fixture test; không reset DB.\n";
    } else {
        throw new RuntimeException('Dùng setup/reprice/cleanup.');
    }
}
