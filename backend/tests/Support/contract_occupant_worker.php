<?php

use App\Models\User;
use App\Services\ContractOccupantService;
use App\Services\ContractService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
TestCase::ensureSafeTestDatabase($app['config']);
$identity = DB::selectOne('SELECT DATABASE() db, CURRENT_USER() account');
if ($identity->db !== TestCase::TEST_DATABASE || $identity->account !== 'mini_apartment_test@%' || getenv('RUN_MIGRATIONS') !== 'false') {
    throw new RuntimeException('Unsafe occupant worker database');
}
$data = json_decode($argv[1], true, 512, JSON_THROW_ON_ERROR);
if (! str_starts_with($data['ready'], storage_path('framework/testing/occupant-race-'))) {
    throw new RuntimeException('Unsafe occupant worker path');
}
try {
    $actor = User::findOrFail($data['actor']);
    file_put_contents($data['ready'], 'ready');
    if ($data['mode'] === 'activate') {
        $contracts = app(ContractService::class);
        $contracts->activate($contracts->find($data['contract']), $actor, [
            'expected_revision' => $data['lifecycle_revision'], 'initial_electricity_reading' => '0.00',
            'initial_water_reading' => '0.00', 'meter_gap_reason' => null, 'meter_gap_confirmed' => false,
        ]);
        echo json_encode(['status' => 200]);
    } else {
        app(ContractOccupantService::class)->store((string) $data['contract'], $actor, [
            'expected_revision' => $data['revision'], 'full_name' => 'Occupant race test only',
        ]);
        echo json_encode(['status' => 201]);
    }
} catch (Throwable $failure) {
    echo json_encode(['status' => method_exists($failure, 'getStatusCode') ? $failure->getStatusCode() : 500]);
}
