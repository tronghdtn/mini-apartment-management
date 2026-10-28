<?php

/** Disposable PAY fixtures with exact financial/file ownership and test-only pending M19. */

use App\Models\Contract;
use App\Models\Payment;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
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
$file = $argv[2] ?? '';
if ($file !== storage_path('app/payments-20261028.json')) {
    throw new RuntimeException('Unexpected manifest path.');
}
$invoiceFile = storage_path('app/invoices-20261028.json');
$proofDirectory = storage_path('app/evidence/payment-proofs');
$proofDirectoryBefore = is_dir($proofDirectory) ? [
    'mode' => fileperms($proofDirectory) & 0777,
    'uid' => fileowner($proofDirectory),
    'gid' => filegroup($proofDirectory),
] : null;
$save = function (array $data) use ($file): void {
    $json = json_encode($data, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
    $handle = fopen($file.'.tmp', 'x');
    if ($handle === false) {
        throw new RuntimeException('Existing temporary checkpoint.');
    }
    try {
        chmod($file.'.tmp', 0600);
        if (fwrite($handle, $json) !== strlen($json) || ! fflush($handle)) {
            throw new RuntimeException('Cannot checkpoint fixtures.');
        }
    } finally {
        fclose($handle);
    }
    if (! rename($file.'.tmp', $file)) {
        throw new RuntimeException('Cannot publish fixture checkpoint.');
    }
};
$invoiceAction = function (string $action) use ($invoiceFile): void {
    $process = new Process([PHP_BINARY, base_path('tests/Support/InvoiceBrowserFixtures.php'), $action, $invoiceFile], base_path());
    $process->setTimeout(120);
    $process->mustRun();
};
$attachments = require database_path('migrations/pending/2026_10_14_400019_create_attachments_table.php');
if (($argv[1] ?? '') === 'setup') {
    if (is_file($file) || is_file($invoiceFile) || Schema::hasTable('attachments') || Storage::disk('private')->allFiles('payment-proofs') !== []) {
        throw new RuntimeException('Existing schema/data/file owner: stop before setup.');
    }
    $invoiceAction('setup');
    $data = json_decode(file_get_contents($invoiceFile), true, flags: JSON_THROW_ON_ERROR);
    $data['phase'] = 'invoices_ready';
    $save($data);
    $attachments->up();
    $data['phase'] = 'attachments_ready';
    $save($data);
    Storage::disk('private')->makeDirectory('payment-proofs');
    $directory = Storage::disk('private')->path('payment-proofs');
    if (realpath($directory) !== storage_path('app/evidence/payment-proofs')) {
        throw new RuntimeException('Unexpected private evidence path.');
    }
    // CLI concurrency fixtures ran as root; HTTP workers need ownership of this empty private test directory.
    if (function_exists('posix_geteuid') && posix_geteuid() === 0
        && (! chown($directory, 'www-data') || ! chgrp($directory, 'www-data') || ! chmod($directory, 0700))) {
        throw new RuntimeException('Cannot hand off empty test proof directory.');
    }
    $data['proof_directory_before'] = $proofDirectoryBefore;
    $data['phase'] = 'fixtures_ready';
    $save($data);
    echo "PAY scoped fixtures ready\n";
} elseif (($argv[1] ?? '') === 'cleanup') {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (($data['phase'] ?? '') !== 'fixtures_ready') {
        throw new RuntimeException('Inspect partial setup before cleanup.');
    }
    $contracts = array_values($data['contracts']);
    $rooms = array_values($data['rooms']);
    if (Contract::withTrashed()->whereIn('id', $contracts)->whereIn('room_id', $rooms)->whereIn('user_id', $data['tenants'])->count() !== count($contracts)) {
        throw new RuntimeException('Fixture contract ownership changed.');
    }
    $invoiceIds = DB::table('invoices')->whereIn('contract_id', $contracts)->pluck('id');
    $paymentIds = Payment::whereIn('invoice_id', $invoiceIds)->pluck('id');
    $photos = DB::table('attachments')->get();
    foreach ($photos as $photo) {
        if ($photo->attachable_type !== 'payment' || ! $paymentIds->contains($photo->attachable_id)
            || $photo->collection !== 'payment_proof' || $photo->disk !== 'private'
            || ! preg_match('~^payment-proofs/[a-zA-Z0-9]{40}\.(png|jpg|jpeg|webp)$~D', $photo->path)) {
            throw new RuntimeException('Unowned attachment/path; stop without deleting.');
        }
    }
    $actual = Storage::disk('private')->allFiles('payment-proofs');
    $expected = $photos->pluck('path')->all();
    sort($actual);
    sort($expected);
    if ($actual !== $expected) {
        throw new RuntimeException('Proof file/metadata mismatch; inspect before cleanup.');
    }
    DB::transaction(function () use ($photos, $paymentIds): void {
        DB::table('attachments')->whereIn('id', $photos->pluck('id'))->delete();
        DB::table('payments')->whereIn('id', $paymentIds)->delete();
    });
    foreach ($photos as $photo) {
        Storage::disk('private')->delete($photo->path);
    }
    $proofDirectory = storage_path('app/evidence/payment-proofs');
    $directoryBefore = $data['proof_directory_before'] ?? null;
    if ($directoryBefore === null) {
        if (is_dir($proofDirectory) && ! rmdir($proofDirectory)) {
            throw new RuntimeException('Cannot remove empty test-created proof directory.');
        }
    } elseif (function_exists('posix_geteuid') && posix_geteuid() === 0) {
        if (! chown($proofDirectory, $directoryBefore['uid'])
            || ! chgrp($proofDirectory, $directoryBefore['gid'])
            || ! chmod($proofDirectory, $directoryBefore['mode'])) {
            throw new RuntimeException('Cannot restore the pre-existing proof directory metadata.');
        }
    }
    $attachments->down();
    $invoiceAction('cleanup');
    unlink($file);
    echo "PAY exact payment/file/parent IDs cleaned; original test schema restored\n";
} else {
    throw new RuntimeException('Unknown action.');
}
