<?php

namespace Tests\Feature\Utilities;

use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Building;
use App\Models\Contract;
use App\Models\MeterReading;
use App\Models\MeterReadingSubmission;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class MeterSubmissionConcurrencyTest extends TestCase
{
    public static function actions(): array
    {
        return ['two approvals' => ['approve'], 'approval versus direct entry' => ['reading'], 'approval versus rejection' => ['reject']];
    }

    #[DataProvider('actions')]
    public function test_approval_serializes_with_other_writers(string $other): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasTable('meter_reading_submissions'));
        $this->assertFalse(Schema::hasTable('attachments'));
        $this->assertFalse(Schema::hasColumn('utility_prices', 'building_id'));
        $this->assertFalse(Schema::hasColumn('meter_readings', 'final_contract_id'));
        $schema = $processes = [];
        $service = $building = $room = $tenant = $admin = $contract = $submission = $attachment = null;
        $createdService = false;
        $path = 'meter-readings/concurrency-'.bin2hex(random_bytes(12)).'.png';
        try {
            foreach (['2026_10_27_000002_scope_utility_prices_to_buildings.php', '2026_10_28_000001_scope_final_meter_readings_to_contracts.php',
                '2026_10_14_400019_create_attachments_table.php', '2026_10_27_000003_create_meter_reading_submissions_table.php'] as $name) {
                $migration = require database_path('migrations/pending/'.$name);
                $migration->up();
                $schema[] = $migration;
            }
            $service = Service::where('code', 'ELECTRICITY')->first();
            if (! $service) {
                $service = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
                $createdService = true;
            }
            $this->assertTrue($service->isMetered() && $service->status === ServiceStatus::Active);
            $building = Building::factory()->create();
            $room = Room::factory()->create(['building_id' => $building->id]);
            $tenant = User::factory()->role(UserRole::Resident)->create();
            $admin = User::factory()->role(UserRole::Admin)->create();
            $contract = Contract::factory()->active()->create(['room_id' => $room->id, 'user_id' => $tenant->id]);
            $contract->contractServices()->create(['service_id' => $service->id, 'quantity' => '1.00', 'unit_price' => null, 'start_date' => '2026-10-01']);
            DB::table('utility_prices')->insert(['building_id' => $building->id, 'service_id' => $service->id, 'unit_price' => 3500, 'effective_from' => '2026-10-01']);
            $submission = new MeterReadingSubmission(['period' => '2026-10-01', 'reading_date' => '2026-11-01', 'current_reading' => '112.35']);
            $submission->room_id = $room->id;
            $submission->contract_id = $contract->id;
            $submission->service_id = $service->id;
            $submission->submitted_by = $tenant->id;
            $submission->save();
            Storage::disk('private')->put($path, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
            $attachment = new Attachment;
            foreach (['attachable_type' => 'meter_reading_submission', 'attachable_id' => $submission->id, 'collection' => Attachment::METER_READING_PHOTO,
                'disk' => 'private', 'path' => $path, 'original_name' => 'meter.png', 'mime_type' => 'image/png', 'size_bytes' => Storage::disk('private')->size($path)] as $key => $value) {
                $attachment->{$key} = $value;
            }
            $attachment->save();
            $approval = ['submission_id' => $submission->id, 'actor_id' => $admin->id];
            $entry = ['room_id' => $room->id, 'service_id' => $service->id, 'period' => '2026-10-01', 'reading_date' => '2026-11-01', 'current_reading' => '112.35'];
            DB::beginTransaction();
            Room::whereKey($room->id)->lockForUpdate()->firstOrFail();
            foreach ([['job' => 'first', 'action' => 'approve', 'data' => $approval], ['job' => 'second', 'action' => $other, 'data' => $other === 'reading' ? $entry : $approval]] as $input) {
                $process = new Process([PHP_BINARY, base_path('tests/Support/RunMeterAction.php'), json_encode($input, JSON_THROW_ON_ERROR)], base_path(), ['DB_CONNECTION' => 'mysql_test', 'APP_ENV' => 'testing']);
                $process->setTimeout(30);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 10;
            while (count(array_filter($processes, fn ($process) => str_contains($process->getOutput(), "READY\n"))) !== 2) {
                if (microtime(true) > $deadline) {
                    $this->fail('Children did not reach READY.');
                }
                usleep(10000);
            }
            foreach ($processes as $process) {
                $this->assertTrue($process->isRunning(), 'Child completed while room remained locked.');
            }
            DB::commit();
            $results = [];
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), $process->getErrorOutput().$process->getOutput());
                $lines = explode("\n", trim($process->getOutput()));
                $result = json_decode(end($lines), true, flags: JSON_THROW_ON_ERROR);
                $results[$result['job']] = $result['status'];
            }
            $current = $submission->fresh();
            $count = MeterReading::where('room_id', $room->id)->count();
            if ($other === 'approve') {
                $this->assertSame(['first' => 200, 'second' => 200], $results);
                $this->assertSame('approved', $current->status->value);
                $this->assertSame(1, $count);
            } elseif ($other === 'reading') {
                $this->assertContains($results, [['first' => 200, 'second' => 409], ['first' => 409, 'second' => 201]]);
                $this->assertSame($results['first'] === 200 ? 'approved' : 'pending', $current->status->value);
                $this->assertSame(1, $count);
            } else {
                $statuses = array_values($results);
                sort($statuses);
                $this->assertSame([200, 409], $statuses);
                $this->assertSame($results['first'] === 200 ? 'approved' : 'rejected', $current->status->value);
                $this->assertSame($results['first'] === 200 ? 1 : 0, $count);
            }
            $this->assertSame($current->status->value === 'approved', $current->approved_meter_reading_id !== null);
            if ($count) {
                $this->assertSame(43225, MeterReading::where('room_id', $room->id)->sole()->amount);
            }
        } finally {
            while (DB::transactionLevel()) {
                DB::rollBack();
            }
            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
            if ($attachment) {
                $attachment->delete();
            }
            Storage::disk('private')->delete($path);
            if ($submission) {
                $submission->delete();
            }
            if ($room) {
                DB::table('meter_readings')->where('room_id', $room->id)->delete();
            }
            if ($contract) {
                DB::table('contract_services')->where('contract_id', $contract->id)->delete();
                DB::table('contracts')->where('id', $contract->id)->delete();
            }
            $room?->delete();
            if ($building) {
                DB::table('utility_prices')->where('building_id', $building->id)->delete();
                $building->delete();
            }
            $tenant?->delete();
            $admin?->delete();
            if ($createdService) {
                $service->delete();
            }
            foreach (array_reverse($schema) as $migration) {
                $migration->down();
            }
        }
    }
}
