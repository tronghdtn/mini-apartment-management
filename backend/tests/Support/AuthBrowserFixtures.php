<?php

/** CLI hỗ trợ browser test, không phải Artisan command/API sản phẩm. */

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

if (PHP_SAPI !== 'cli') {
    throw new RuntimeException('Chỉ chạy qua CLI trên môi trường test.');
}

chdir(dirname(__DIR__, 2));
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
TestCase::ensureSafeTestDatabase($app->make(Repository::class));
$identity = DB::selectOne('SELECT DATABASE() AS db, CURRENT_USER() AS account');
if ($identity->db !== TestCase::TEST_DATABASE || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Từ chối thao tác ngoài DB/tài khoản test.');
}

$action = $argv[1] ?? '';
$file = $argv[2] ?? sys_get_temp_dir().'/auth-step4-fixtures.json';

if ($action === 'setup') {
    if (is_file($file)) {
        throw new RuntimeException('File fixtures đã tồn tại; cleanup dữ liệu cũ rồi chọn đường dẫn file mới.');
    }
    $run = bin2hex(random_bytes(4));
    $password = bin2hex(random_bytes(12));
    $base = random_int(1000000, 8999999);
    $data = DB::transaction(function () use ($run, $password, $base) {
        $result = ['run' => $run, 'password' => $password, 'accounts' => []];
        foreach (UserRole::cases() as $index => $role) {
            $user = new User([
                'full_name' => 'AuthStep4 '.$run.' '.$role->value,
                'email' => 'auth-step4-'.$run.'-'.$role->value.'@example.test',
                'phone' => '09'.($base * 10 + $index),
                'password' => $password,
            ]);
            $user->role = $role;
            $user->status = UserStatus::Active;
            $user->save();
            $result['accounts'][$role->value] = ['id' => $user->id, 'phone' => $user->phone, 'email' => $user->email, 'name' => $user->full_name];
        }
        $result['register_phone'] = '09'.($base * 10 + 7);
        $result['register_phone2'] = '09'.($base * 10 + 8);

        return $result;
    });
    if (file_put_contents($file, json_encode($data, JSON_THROW_ON_ERROR)) === false) {
        throw new RuntimeException('Không ghi được file fixtures test.');
    }
    echo "Created role fixtures on guarded test DB; credentials not printed.\n";
} elseif (in_array($action, ['status', 'cleanup', 'registration-cleanup'], true)) {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (! preg_match('/^[a-f0-9]{8}$/D', $data['run'] ?? '')) {
        throw new RuntimeException('Sai mã lượt kiểm thử.');
    }
    if ($action === 'status') {
        $account = $data['accounts'][$argv[3] ?? ''] ?? throw new RuntimeException('Sai vai trò fixtures.');
        $status = UserStatus::from($argv[4] ?? '');
        $user = User::whereKey($account['id'])->where('full_name', $account['name'])->firstOrFail();
        $user->status = $status;
        $user->save();
        echo "Updated guarded test fixture status.\n";
    } else {
        $phones = [$data['register_phone'], $data['register_phone2']];
        if ($action === 'cleanup') {
            $phones = array_merge($phones, array_column($data['accounts'], 'phone'));
        }
        $query = User::where('full_name', 'like', 'AuthStep4 '.$data['run'].' %')->whereIn('phone', $phones);
        $ids = $query->pluck('id')->all();
        DB::transaction(function () use ($ids) {
            DB::table('sessions')->whereIn('user_id', $ids)->delete();
            User::whereIn('id', $ids)->delete();
        });
        echo 'Removed '.count($ids)." matching fixtures ONLY from test DB.\n";
    }
} else {
    throw new RuntimeException('Dùng setup/status/registration-cleanup/cleanup và đường dẫn file fixtures.');
}
