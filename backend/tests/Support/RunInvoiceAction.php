<?php

/** Independent process for guarded test-DB invoice locking checks. */

use App\Models\Invoice;
use App\Services\InvoiceService;
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
$input = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);
echo "READY\n";
flush();
$status = $input['action'] === 'create' ? 201 : 200;
try {
    $service = app(InvoiceService::class);
    match ($input['action']) {
        'create' => $service->createMonthly($input['data']),
        'issue' => $service->issue(Invoice::findOrFail($input['data']['id']), $input['data']['revision']),
        'cancel' => $service->cancel(Invoice::findOrFail($input['data']['id']), ['expected_revision' => $input['data']['revision'], 'reason' => 'Test cạnh tranh hủy/phát hành']),
    };
} catch (HttpExceptionInterface $exception) {
    $status = $exception->getStatusCode();
}
echo json_encode(['action' => $input['action'], 'status' => $status], JSON_THROW_ON_ERROR)."\n";
