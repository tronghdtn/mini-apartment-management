<?php

// Chỉ dùng trong test tranh chấp, không có route hoặc lệnh quản trị gọi script này.
use App\Models\Room;
use App\Models\User;
use App\Services\RoomPhotoService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
TestCase::ensureSafeTestDatabase($app['config']);
$identity = DB::selectOne('SELECT DATABASE() db, CURRENT_USER() account');
if ($identity->db !== 'mini_apartment_test' || $identity->account !== 'mini_apartment_test@%' || getenv('RUN_MIGRATIONS') !== 'false') {
    throw new RuntimeException('Unsafe gallery worker database');
}
$data = json_decode($argv[1], true, 512, JSON_THROW_ON_ERROR);
if (! str_starts_with($data['root'], storage_path('framework/testing/disks/'))) {
    throw new RuntimeException('Unsafe gallery worker files');
}
config(['filesystems.disks.private.root' => $data['root']]);
Storage::forgetDisk('private');
$temp = null;
try {
    $room = Room::findOrFail($data['room']);
    $actor = User::findOrFail($data['actor']);
    file_put_contents($data['ready'], 'ready');
    $service = app(RoomPhotoService::class);
    if ($data['mode'] === 'upload') {
        $temp = tempnam(sys_get_temp_dir(), 'gallery-photo-');
        file_put_contents($temp, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $service->store($room, $actor, [new UploadedFile($temp, 'photo.png', 'image/png', null, true)]);
        $status = 201;
    } else {
        $service->cover($room, $actor, $data['photo'], $data['expected']);
        $status = 200;
    }
    echo json_encode(['status' => $status]);
} catch (Throwable $failure) {
    echo json_encode(['status' => method_exists($failure, 'getStatusCode') ? $failure->getStatusCode() : 500, 'kind' => get_class($failure)]);
} finally {
    if ($temp !== null && is_file($temp)) {
        unlink($temp);
    }
}
