<?php

use App\Services\ViewingAppointmentService;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
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
echo "READY\n";
flush();
try {
    app(ViewingAppointmentService::class)->store(['room_id' => (int) $argv[1], 'guest_name' => 'Khách tranh chấp', 'guest_phone' => '0901234567',
        'preferred_at' => now('Asia/Ho_Chi_Minh')->addDay()->setTime(10, 0)->format('Y-m-d\TH:i:sP')], null, '192.0.2.100');
    $status = 201;
} catch (HttpExceptionInterface $error) {
    $status = $error->getStatusCode();
}
echo json_encode(['status' => $status], JSON_THROW_ON_ERROR)."\n";
