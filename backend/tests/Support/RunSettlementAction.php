<?php

/** An independent process, restricted to the dedicated MySQL test identity. */

use App\Models\Contract;
use App\Models\Invoice;
use App\Models\User;
use App\Services\ContractSettlementService;
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
$identity = DB::selectOne('SELECT DATABASE() db,CURRENT_USER() account');
if ($identity->db !== 'mini_apartment_test' || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Wrong test identity.');
}
$input = json_decode($argv[1], true, flags: JSON_THROW_ON_ERROR);
echo "READY\n";
flush();
$status = in_array($input['action'], ['cash', 'proof'], true) ? 201 : 200;
$temporary = null;
$refund = null;
try {
    $actor = User::findOrFail($input['actor']);
    if ($input['action'] === 'refund') {
        $refund = app(ContractSettlementService::class)->confirmRefund(Contract::findOrFail($input['contract']), $actor,
            ['expected_revision' => $input['revision'], 'expected_refund_amount' => $input['refund_amount'], 'confirmed_paid' => true]);
    } elseif ($input['action'] === 'proof') {
        $temporary = tempnam(sys_get_temp_dir(), 'settlement-race-');
        file_put_contents($temporary, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        app(PaymentService::class)->store(Invoice::findOrFail($input['invoice']), $actor, ['amount' => 400000], new UploadedFile($temporary, 'proof.png', null, null, true));
    } else {
        match ($input['action']) {
            'terminate' => app(ContractSettlementService::class)->terminate(Contract::findOrFail($input['contract']), $actor, ['expected_revision' => $input['revision'], 'confirmed' => true]),
            'cash' => app(PaymentService::class)->store(Invoice::findOrFail($input['invoice']), $actor, ['amount' => 600000, 'method' => 'cash', 'confirmed_received' => true, 'expected_revision' => $input['invoice_revision']]),
            'cancel' => app(InvoiceService::class)->cancel(Invoice::findOrFail($input['invoice']), ['expected_revision' => $input['invoice_revision'], 'reason' => 'Kiểm thử tranh chấp thanh lý/hủy.']),
            'confirm' => app(PaymentService::class)->confirm(app(PaymentService::class)->find($input['payment']), $actor, ['expected_amount' => 400000, 'confirmed_received' => true, 'expected_revision' => $input['payment_revision']]),
        };
    }
} catch (ValidationException) {
    $status = 422;
} catch (HttpExceptionInterface $failure) {
    $status = $failure->getStatusCode();
} finally {
    if ($temporary !== null && is_file($temporary)) {
        unlink($temporary);
    }
}
echo json_encode(['action' => $input['action'], 'status' => $status,
    ...($refund === null ? [] : ['refunded_by' => $refund['deposit_refunded_by'], 'refunded_at' => $refund['deposit_refunded_at']])], JSON_THROW_ON_ERROR)."\n";
