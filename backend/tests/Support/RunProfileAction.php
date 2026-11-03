<?php

// Test-only subprocess. Never a route/command exposed to application users.
use App\Models\User;
use App\Services\AccountProfileService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Tests\TestCase;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
try {
    TestCase::ensureSafeTestDatabase($app['config']);
    $identity = DB::selectOne('SELECT DATABASE() db, CURRENT_USER() account');
    if ($identity->db !== TestCase::TEST_DATABASE || $identity->account !== 'mini_apartment_test@%') {
        throw new RuntimeException('Unsafe profile subprocess.');
    }
    $input = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);
    $actor = User::findOrFail($input['actor']);
    echo "READY\n";
    flush();
    app(AccountProfileService::class)->changePassword($actor, ['current_password' => 'Profile race test old!42',
        'password' => 'Profile race test new!43']);
    echo json_encode(['status' => 204]);
} catch (HttpExceptionInterface $failure) {
    echo json_encode(['status' => $failure->getStatusCode()]);
} catch (Throwable) {
    echo json_encode(['status' => 500]);
    exit(1);
}
