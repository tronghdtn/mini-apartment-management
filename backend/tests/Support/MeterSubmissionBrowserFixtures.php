<?php

/** Disposable U2 live fixtures: explicit test-only DDL, exact IDs, no shared/dev data. */

use App\Models\MeterReadingSubmission;
use App\Models\User;
use App\Services\MeterReadingSubmissionService;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
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
$identity = DB::selectOne('SELECT DATABASE() AS db, CURRENT_USER() AS account');
if ($identity->db !== 'mini_apartment_test' || $identity->account !== 'mini_apartment_test@%') {
    throw new RuntimeException('Wrong test identity.');
}
$file = $argv[2] ?? '';
if ($file !== storage_path('app/meter-submissions-20261028.json')) {
    throw new RuntimeException('Unexpected manifest path.');
}
$meterFile = $file.'.meters';
$save = function (array $data) use ($file): void {
    $json = json_encode($data, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
    if (file_put_contents($file.'.tmp', $json) !== strlen($json) || ! rename($file.'.tmp', $file)) {
        throw new RuntimeException('Cannot checkpoint fixture manifest.');
    }
};
$attachments = require database_path('migrations/pending/2026_10_14_400019_create_attachments_table.php');
$submissions = require database_path('migrations/pending/2026_10_27_000003_create_meter_reading_submissions_table.php');
$handoffPhotos = function (array $data): void {
    // CLI fixtures run as root; HTTP workers are www-data. Flysystem private directories are 0700.
    $directory = Storage::disk('private')->path('meter-readings');
    if (realpath($directory) !== storage_path('app/evidence/meter-readings')) {
        throw new RuntimeException('Unexpected evidence directory.');
    }
    $owned = MeterReadingSubmission::whereIn('room_id', array_values($data['rooms']))->get();
    $photos = DB::table('attachments')->where('attachable_type', 'meter_reading_submission')->get();
    foreach ($photos as $photo) {
        if (! in_array($photo->attachable_id, $owned->modelKeys(), true) || $photo->disk !== 'private'
            || ! preg_match('~^meter-readings/[a-zA-Z0-9]{40}\.(png|jpg|jpeg|webp)$~D', $photo->path)) {
            throw new RuntimeException('Unowned photo: stop permission handoff.');
        }
    }
    if (function_exists('posix_geteuid') && posix_geteuid() === 0) {
        if (! chown($directory, 'www-data') || ! chgrp($directory, 'www-data') || ! chmod($directory, 0700)) {
            throw new RuntimeException('Cannot hand off private directory to HTTP worker.');
        }
        foreach ($photos as $photo) {
            $path = Storage::disk('private')->path($photo->path);
            if (! chown($path, 'www-data') || ! chgrp($path, 'www-data') || ! chmod($path, 0600)) {
                throw new RuntimeException('Cannot hand off owned fixture photo.');
            }
        }
    }
};
$meterAction = function (string $action) use ($meterFile): void {
    $process = new Process([PHP_BINARY, base_path('tests/Support/MeterReadingBrowserFixtures.php'), $action, $meterFile], base_path());
    $process->setTimeout(120);
    $process->mustRun();
};
if (($argv[1] ?? '') === 'setup') {
    if (is_file($file) || is_file($meterFile)) {
        throw new RuntimeException('Existing fixture checkpoint: inspect before setup.');
    }
    $meterAction('setup');
    $data = json_decode(file_get_contents($meterFile), true, flags: JSON_THROW_ON_ERROR);
    $data['phase'] = 'meters_ready';
    $save($data);
    $attachments->up();
    $data['phase'] = 'attachments_ready';
    $save($data);
    $submissions->up();
    $data['phase'] = 'schema_ready';
    $save($data);
    DB::transaction(function () use (&$data, $save): void {
        foreach (['ui_batch_1', 'ui_batch_2', 'api_validation', 'api_flow', 'api_flow_b', 'api_race'] as $key) {
            $contract = DB::table('contracts')->find($data['contracts'][$key]);
            if (! in_array($contract->user_id, $data['tenants'], true)) {
                throw new RuntimeException('Unexpected tenant identity.');
            }
            $user = User::findOrFail($contract->user_id);
            $password = 'U2-'.bin2hex(random_bytes(20)).'!';
            $user->password = $password;
            $user->save();
            $data['accounts'][$key] = ['id' => $user->id, 'phone' => $user->phone, 'password' => $password];
        }
        $data['phase'] = 'fixtures_ready';
        $save($data);
    });
    // A seed request for read-only auth probes; all other lanes begin with no submissions.
    $temp = tempnam(sys_get_temp_dir(), 'u2-photo-');
    try {
        file_put_contents($temp, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $request = app(MeterReadingSubmissionService::class)->store(User::findOrFail($data['accounts']['api_flow_b']['id']),
            ['service_id' => $data['services']['ELECTRICITY'], 'period' => '2026-10-01', 'reading_date' => '2026-11-01', 'current_reading' => '112.35'],
            new UploadedFile($temp, 'meter.png', null, null, true));
        $data['auth_submission_id'] = $request->id;
        $save($data);
        $handoffPhotos($data);
    } finally {
        if (is_file($temp)) {
            unlink($temp);
        }
    }
    echo "U2 scoped fixtures ready\n";
} elseif (($argv[1] ?? '') === 'handoff-private-photos') {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (($data['phase'] ?? '') !== 'fixtures_ready') {
        throw new RuntimeException('Inspect partial fixtures before permission handoff.');
    }
    $handoffPhotos($data);
    echo "Owned private fixture directory/photos handed to HTTP worker\n";
} elseif (($argv[1] ?? '') === 'cleanup') {
    $data = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
    if (($data['phase'] ?? '') !== 'fixtures_ready') {
        throw new RuntimeException('Inspect partial DDL before cleanup.');
    }
    $owned = MeterReadingSubmission::whereIn('room_id', array_values($data['rooms']))->get();
    $photos = DB::table('attachments')->get();
    if (DB::table('meter_reading_submissions')->whereNotIn('id', $owned->modelKeys())->exists()
        || $owned->contains(fn ($row) => ! in_array($row->contract_id, array_values($data['contracts']), true)
            || ! in_array($row->submitted_by, $data['tenants'], true))
        || $photos->contains(fn ($row) => $row->attachable_type !== 'meter_reading_submission' || ! in_array($row->attachable_id, $owned->modelKeys(), true)
            || $row->disk !== 'private' || $row->collection !== 'meter_reading_photo'
            || ! preg_match('~^meter-readings/[a-zA-Z0-9]{40}\.(png|jpg|jpeg|webp)$~D', $row->path))) {
        throw new RuntimeException('Unowned U2 data/path; stop without deleting.');
    }
    DB::transaction(function () use ($owned, $photos): void {
        DB::table('attachments')->whereIn('id', $photos->pluck('id'))->delete();
        DB::table('meter_reading_submissions')->whereIn('id', $owned->modelKeys())->delete();
    });
    foreach ($photos as $photo) {
        Storage::disk('private')->delete($photo->path);
    }
    $submissions->down();
    $attachments->down();
    $meterAction('cleanup');
    unlink($file);
    echo "U2 files/fixture IDs cleaned and original test schema restored\n";
} else {
    throw new RuntimeException('Unknown action.');
}
