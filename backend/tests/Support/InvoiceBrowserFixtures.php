<?php

/** Disposable invoice live fixtures. Wrap MTR's guarded owned-ID/schema lifecycle. */

use App\Models\Contract;
use App\Models\User;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
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
$identity = DB::selectOne('SELECT DATABASE() AS db, CURRENT_USER() AS account');
if ($identity->db !== 'mini_apartment_test' || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Wrong test identity.');
}
$file = $argv[2] ?? '';
if ($file !== storage_path('app/invoices-20261028.json')) {
    throw new RuntimeException('Unexpected manifest path.');
}
$meterFile = $file.'.meters';
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
$meterAction = function (string $action) use ($meterFile): void {
    $process = new Process([PHP_BINARY, base_path('tests/Support/MeterReadingBrowserFixtures.php'), $action, $meterFile], base_path());
    $process->setTimeout(120);
    $process->mustRun();
};
if (($argv[1] ?? '') === 'setup') {
    if (is_file($file) || is_file($meterFile)) {
        throw new RuntimeException('Existing fixture checkpoint.');
    }
    $meterAction('setup');
    $data = json_decode(file_get_contents($meterFile), true, flags: JSON_THROW_ON_ERROR);
    $data['phase'] = 'meters_ready';
    $save($data);
    DB::transaction(function () use (&$data, $save): void {
        foreach (['ui_batch_1', 'ui_batch_2', 'api_validation', 'api_flow', 'api_flow_b', 'api_race'] as $key) {
            $contract = Contract::findOrFail($data['contracts'][$key]);
            if (! in_array($contract->user_id, $data['tenants'], true) || $contract->room_id !== $data['rooms'][$key]) {
                throw new RuntimeException('Unexpected fixture identity.');
            }
            // Historical precondition only; activation already exercised by the MTR fixture service.
            // Live tests create the actual September consumption using POST meter-readings.
            $contract->start_date = '2026-09-16';
            $contract->monthly_rent = $key === 'ui_batch_2' ? 0 : 3100000;
            $contract->save();
            $contract->contractServices()->update(['start_date' => '2026-09-16']);
            $user = User::findOrFail($contract->user_id);
            $password = 'INV-'.bin2hex(random_bytes(20)).'!';
            $user->password = $password;
            $user->save();
            $data['accounts'][$key] = ['id' => $user->id, 'phone' => $user->phone, 'password' => $password];
        }
        $data['phase'] = 'fixtures_ready';
        $save($data);
    });
    echo "INV scoped fixtures ready\n";
} elseif (($argv[1] ?? '') === 'cleanup') {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (($data['phase'] ?? '') !== 'fixtures_ready') {
        throw new RuntimeException('Inspect partial fixture setup.');
    }
    DB::transaction(function () use ($data): void {
        $contracts = array_values($data['contracts']);
        $rooms = array_values($data['rooms']);
        if (Contract::withTrashed()->whereIn('id', $contracts)->whereIn('room_id', $rooms)->whereIn('user_id', $data['tenants'])->count() !== count($contracts)) {
            throw new RuntimeException('Fixture ownership changed.');
        }
        $ids = DB::table('invoices')->whereIn('contract_id', $contracts)->pluck('id');
        if (DB::table('payments')->whereIn('invoice_id', $ids)->exists()
            || DB::table('invoices')->whereIn('related_invoice_id', $ids)->whereNotIn('id', $ids)->exists()
            || DB::table('meter_readings')->whereIn('invoice_id', $ids)->where(function ($q) use ($contracts, $rooms) {
                $q->whereNull('contract_id')->orWhereNotIn('contract_id', $contracts)->orWhereNotIn('room_id', $rooms);
            })->exists()) {
            throw new RuntimeException('Unexpected payment or unowned invoice/reading dependency.');
        }
        DB::table('meter_readings')->whereIn('invoice_id', $ids)->update(['invoice_id' => null]);
        DB::table('invoice_items')->whereIn('invoice_id', $ids)->delete();
        // RESTRICT self-FK: delete descendants before original cancelled invoices.
        foreach ($ids->sortDesc() as $id) {
            DB::table('invoices')->where('id', $id)->delete();
        }
    });
    $meterAction('cleanup');
    unlink($file);
    echo "INV exact IDs cleaned; original test schema restored\n";
} else {
    throw new RuntimeException('Unknown action.');
}
