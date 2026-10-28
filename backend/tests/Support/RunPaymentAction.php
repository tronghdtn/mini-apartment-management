<?php

/** Independent guarded test-DB process for actual financial locking races. */

use App\Models\Invoice;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
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
$identity = DB::selectOne('SELECT DATABASE() AS db,CURRENT_USER() AS account');
if ($identity->db !== 'mini_apartment_test' || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Wrong test identity.');
}
$input = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);
$temp = null;
echo "READY\n";
flush();
$status = in_array($input['action'], ['cash', 'proof'], true) ? 201 : 200;
try {
    $service = app(PaymentService::class);
    $actor = User::findOrFail($input['actor']);
    if ($input['action'] === 'proof') {
        $temp = tempnam(sys_get_temp_dir(), 'pay-race-');
        file_put_contents($temp, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $service->store(Invoice::findOrFail($input['invoice']), $actor, ['amount' => 400000], new UploadedFile($temp, 'proof.png', null, null, true));
    } else {
        match ($input['action']) {
            'cash' => $service->store(Invoice::findOrFail($input['invoice']), $actor, ['amount' => 600000, 'method' => 'cash', 'confirmed_received' => true, 'expected_revision' => $input['revision']]),
            'confirm' => $service->confirm($service->find($input['payment']), $actor, ['expected_revision' => $input['revision'], 'expected_amount' => $input['amount'], 'confirmed_received' => true]),
            'cancel' => app(InvoiceService::class)->cancel(Invoice::findOrFail($input['invoice']), ['expected_revision' => $input['revision'], 'reason' => 'Kiểm tra tranh chấp thanh toán/hủy']),
        };
    }
} catch (ValidationException) {
    $status = 422;
} catch (HttpExceptionInterface $exception) {
    $status = $exception->getStatusCode();
} finally {
    if ($temp !== null && is_file($temp)) {
        unlink($temp);
    }
}
echo json_encode(['action' => $input['action'], 'status' => $status], JSON_THROW_ON_ERROR)."\n";
