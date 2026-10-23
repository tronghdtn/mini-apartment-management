<?php

/** Dọn đúng dữ liệu do browser USR-B tạo, chỉ dùng CLI và DB test riêng. */

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
    throw new RuntimeException('Từ chối dọn ngoài DB/tài khoản test.');
}

$data = json_decode(file_get_contents($argv[1] ?? ''), true, flags: JSON_THROW_ON_ERROR);
if (! preg_match('/^[a-f0-9]{8}$/D', $data['run'] ?? '')) {
    throw new RuntimeException('Sai mã lượt kiểm thử.');
}
$phones = [$data['register_phone'], $data['register_phone2'], substr($data['register_phone'], 0, -1).'9', '07'.substr($data['register_phone'], 2)];
$users = User::where('full_name', 'like', 'STAFF '.$data['run'].' %')->whereIn('phone', $phones)->get();
foreach ($users as $user) {
    if (! in_array($user->role->value, ['technician', 'guard'], true) || DB::table('contracts')->where('user_id', $user->id)->exists()) {
        throw new RuntimeException('Dữ liệu không đúng phạm vi fixture; không xóa.');
    }
}
DB::transaction(function () use ($users): void {
    DB::table('sessions')->whereIn('user_id', $users->modelKeys())->delete();
    User::whereIn('id', $users->modelKeys())->delete();
});
echo 'Removed '.$users->count()." matching STAFF fixtures ONLY from test DB.\n";
