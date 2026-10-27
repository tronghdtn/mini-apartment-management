<?php

/** Child process for the real MySQL activation race tests. */

use App\Models\User;
use App\Services\ContractService;
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
$service = app(ContractService::class);
try {
    $service->activate($service->find($input['id']), User::findOrFail($input['actor']), $input['data']);
    echo '200';
} catch (HttpExceptionInterface $exception) {
    echo $exception->getStatusCode();
}
