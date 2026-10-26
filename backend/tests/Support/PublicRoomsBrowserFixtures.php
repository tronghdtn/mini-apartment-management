<?php

/** CLI fixtures only; never called by an HTTP endpoint or on the development DB. */

use App\Models\Amenity;
use App\Models\Building;
use App\Models\Room;
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
$file = 'storage/framework/testing/public-rooms-browser.json';
if ($mode === 'setup') {
    if (is_file($file)) {
        throw new RuntimeException('Không ghi đè fixture cũ.');
    }
    if (! is_dir(dirname($file))) {
        mkdir(dirname($file), 0770, true);
    }
    $data = DB::transaction(function (): array {
        $run = bin2hex(random_bytes(4));
        $prefix = 'PublicRooms '.$run;
        $building = Building::factory()->create(['name' => $prefix, 'address' => 'Địa chỉ minh họa trên DB test', 'total_floors' => 3]);
        $amenities = Amenity::factory()->count(3)->sequence(['name' => 'Thang máy test'], ['name' => 'Ban công test'], ['name' => 'Tiện nghi lưu trữ test'])->create();
        $building->amenities()->attach([$amenities[0]->id, $amenities[2]->id]);
        $amenities[2]->delete();
        $rooms = [];
        for ($index = 1; $index <= 23; $index++) {
            $room = Room::factory()->create([
                'building_id' => $building->id, 'code' => sprintf('PUB-%02d', $index),
                'is_public' => $index !== 23, 'status' => $index === 22 ? 'occupied' : 'available',
                'base_price' => 3000000 + $index, 'deposit_amount' => 1500000,
                'area' => '25.50', 'max_occupants' => 2,
                'description' => 'Mô tả kiểm thử, không phải phòng thật.',
            ]);
            if ($index === 1) {
                $room->amenities()->attach([$amenities[0]->id, $amenities[1]->id]);
            }
            $rooms[] = $room->id;
        }

        return ['run' => $run, 'building_id' => $building->id, 'rooms' => $rooms, 'amenities' => $amenities->modelKeys()];
    });
    file_put_contents($file, json_encode($data, JSON_THROW_ON_ERROR));
    echo json_encode($data, JSON_THROW_ON_ERROR)."\n";
} elseif ($mode === 'cleanup') {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (! preg_match('/^[a-f0-9]{8}$/D', $data['run'] ?? '') || Building::whereKey($data['building_id'])->where('name', 'PublicRooms '.$data['run'])->count() !== 1
        || Room::whereIn('id', $data['rooms'])->where('building_id', $data['building_id'])->count() !== 23) {
        throw new RuntimeException('Fixture identity không khớp; dừng.');
    }
    DB::transaction(function () use ($data): void {
        DB::table('room_amenities')->whereIn('room_id', $data['rooms'])->delete();
        DB::table('building_amenities')->where('building_id', $data['building_id'])->delete();
        Room::whereIn('id', $data['rooms'])->where('building_id', $data['building_id'])->delete();
        Building::whereKey($data['building_id'])->delete();
        Amenity::withTrashed()->whereIn('id', $data['amenities'])->forceDelete();
    });
    unlink($file);
    echo "Đã dọn đúng fixture test.\n";
} else {
    throw new RuntimeException('Dùng setup/cleanup.');
}
