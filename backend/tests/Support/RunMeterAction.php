<?php

/** Independent child process for MTR/U1 real locking tests; only the guarded test DB. */

use App\Models\MeterReadingSubmission;
use App\Models\User;
use App\Services\MeterReadingService;
use App\Services\MeterReadingSubmissionService;
use App\Services\UtilityPriceService;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
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
$identity = DB::selectOne('SELECT DATABASE() AS db, CURRENT_USER() AS account');
if ($identity->db !== 'mini_apartment_test' || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Wrong test identity.');
}
$input = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);
echo "READY\n";
flush();
$status = in_array($input['action'], ['approve', 'reject'], true) ? 200 : 201;
try {
    match ($input['action']) {
        'reading' => app(MeterReadingService::class)->storeBatch([$input['data']]),
        'price' => app(UtilityPriceService::class)->create($input['data']),
        'approve' => app(MeterReadingSubmissionService::class)->approve(MeterReadingSubmission::findOrFail($input['data']['submission_id']), User::findOrFail($input['data']['actor_id'])),
        'reject' => app(MeterReadingSubmissionService::class)->reject(MeterReadingSubmission::findOrFail($input['data']['submission_id']), User::findOrFail($input['data']['actor_id']), 'Ảnh cần gửi lại trong test tranh chấp'),
    };
} catch (ValidationException) {
    $status = 422;
} catch (HttpExceptionInterface $exception) {
    $status = $exception->getStatusCode();
}
echo json_encode(['job' => $input['job'], 'action' => $input['action'], 'status' => $status], JSON_THROW_ON_ERROR)."\n";
