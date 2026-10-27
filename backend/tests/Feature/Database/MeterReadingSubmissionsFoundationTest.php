<?php

namespace Tests\Feature\Database;

use App\Enums\ContractStatus;
use App\Enums\MeterReadingSubmissionStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\MeterReading;
use App\Models\MeterReadingSubmission;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/** Pending DDL is explicit; fixtures are rolled back BEFORE any teardown DDL. */
class MeterReadingSubmissionsFoundationTest extends TestCase
{
    private const ATTACHMENTS = 'migrations/pending/2026_10_14_400019_create_attachments_table.php';

    private const SUBMISSIONS = 'migrations/pending/2026_10_27_000003_create_meter_reading_submissions_table.php';

    private bool $ownsSchema = false;

    private bool $hasFixtureTransaction = false;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasTable('attachments'), 'Pending M19 must not run with default migrate.');
        $this->assertFalse(Schema::hasTable('meter_reading_submissions'), 'Pending U2 must not run with default migrate.');
        // Both were absent: own any partial DDL from here, including a failing up().
        $this->ownsSchema = true;
        (require database_path(self::ATTACHMENTS))->up();
        (require database_path(self::SUBMISSIONS))->up();
        DB::beginTransaction();
        $this->hasFixtureTransaction = true;
    }

    protected function tearDown(): void
    {
        try {
            if ($this->ownsSchema) {
                if ($this->hasFixtureTransaction) {
                    $this->assertSame(1, DB::transactionLevel(), 'No DDL is allowed inside data-fixture transactions.');
                    DB::rollBack();
                }
                foreach (['meter_reading_submissions' => self::SUBMISSIONS, 'attachments' => self::ATTACHMENTS] as $table => $path) {
                    if (Schema::hasTable($table)) {
                        $this->assertSame(0, DB::table($table)->count());
                        (require database_path($path))->down();
                    }
                }
                $this->assertFalse(Schema::hasTable('meter_reading_submissions'));
                $this->assertFalse(Schema::hasTable('attachments'));
            }
        } finally {
            parent::tearDown();
        }
    }

    public function test_submission_schema_matches_approved_columns_and_generated_slot(): void
    {
        $columns = collect(DB::select("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meter_reading_submissions' ORDER BY ORDINAL_POSITION"))->keyBy('COLUMN_NAME');
        $expected = [
            'id' => ['bigint unsigned', 'NO', null],
            'room_id' => ['bigint unsigned', 'NO', null],
            'contract_id' => ['bigint unsigned', 'NO', null],
            'service_id' => ['bigint unsigned', 'NO', null],
            'period' => ['date', 'NO', null],
            'reading_date' => ['date', 'NO', null],
            'current_reading' => ['decimal(10,2)', 'NO', null],
            'status' => ['varchar(20)', 'NO', 'pending'],
            'submitted_by' => ['bigint unsigned', 'NO', null],
            'reviewed_by' => ['bigint unsigned', 'YES', null],
            'reviewed_at' => ['timestamp', 'YES', null],
            'rejection_reason' => ['text', 'YES', null],
            'approved_meter_reading_id' => ['bigint unsigned', 'YES', null],
            'created_at' => ['timestamp', 'YES', null],
            'updated_at' => ['timestamp', 'YES', null],
            'pending_slot' => ['tinyint unsigned', 'YES', null],
        ];
        $this->assertSame(array_keys($expected), $columns->keys()->all());
        foreach ($expected as $name => $metadata) {
            $column = $columns[$name];
            $this->assertSame($metadata, [$column->COLUMN_TYPE, $column->IS_NULLABLE, $column->COLUMN_DEFAULT], $name);
        }
        $this->assertSame('STORED GENERATED', $columns['pending_slot']->EXTRA);
        $indexes = DB::select("SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_list FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meter_reading_submissions' GROUP BY INDEX_NAME, NON_UNIQUE");
        $byName = collect($indexes)->keyBy('INDEX_NAME');
        $this->assertSame('room_id,service_id,period,pending_slot', $byName['mtr_submissions_pending_unique']->columns_list);
        $this->assertSame(0, $byName['mtr_submissions_pending_unique']->NON_UNIQUE);
        $this->assertSame('approved_meter_reading_id', $byName['mtr_submissions_approved_reading_unique']->columns_list);
        $this->assertSame(0, $byName['mtr_submissions_approved_reading_unique']->NON_UNIQUE);
        $this->assertSame('contract_id,period', $byName['mtr_submissions_contract_period_index']->columns_list);
        $this->assertSame('status,created_at', $byName['mtr_submissions_queue_index']->columns_list);
    }

    public function test_attachment_schema_matches_m19_without_adding_a_polymorphic_sql_foreign_key(): void
    {
        $columns = collect(DB::select("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' ORDER BY ORDINAL_POSITION"));
        $this->assertSame([
            ['id', 'bigint unsigned', 'NO', null],
            ['attachable_type', 'varchar(100)', 'NO', null],
            ['attachable_id', 'bigint unsigned', 'NO', null],
            ['collection', 'varchar(50)', 'NO', null],
            ['disk', 'varchar(20)', 'NO', null],
            ['path', 'varchar(500)', 'NO', null],
            ['original_name', 'varchar(255)', 'NO', null],
            ['mime_type', 'varchar(100)', 'NO', null],
            ['size_bytes', 'bigint unsigned', 'NO', null],
            ['is_cover', 'tinyint(1)', 'NO', '0'],
            ['sort_order', 'int unsigned', 'NO', '0'],
            ['created_at', 'timestamp', 'YES', null],
            ['updated_at', 'timestamp', 'YES', null],
        ], $columns->map(fn ($column) => [$column->COLUMN_NAME, $column->COLUMN_TYPE, $column->IS_NULLABLE, $column->COLUMN_DEFAULT])->all());
        $this->assertSame(0, DB::table('information_schema.REFERENTIAL_CONSTRAINTS')->where('CONSTRAINT_SCHEMA', DB::getDatabaseName())->where('TABLE_NAME', 'attachments')->count());
        $index = DB::select("SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND INDEX_NAME = 'attachments_parent_collection_index' ORDER BY SEQ_IN_INDEX");
        $this->assertSame(['attachable_type', 'attachable_id', 'collection'], array_column($index, 'COLUMN_NAME'));
    }

    public function test_only_one_pending_slot_but_processed_history_and_resubmission_are_retained(): void
    {
        $submission = $this->submission();
        $original = (array) DB::table('meter_reading_submissions')->find($submission->id);
        $duplicate = $original;
        unset($duplicate['id'], $duplicate['pending_slot']);
        $this->assertSqlError(1062, fn () => DB::table('meter_reading_submissions')->insert($duplicate));
        DB::table('meter_reading_submissions')->where('id', $submission->id)->update(['status' => 'rejected', 'rejection_reason' => 'Ảnh cần kiểm tra lại.']);
        $this->assertNull(DB::table('meter_reading_submissions')->where('id', $submission->id)->value('pending_slot'));
        $second = DB::table('meter_reading_submissions')->insertGetId($duplicate);
        $this->assertSame(1, DB::table('meter_reading_submissions')->where('id', $second)->value('pending_slot'));
        $this->assertSqlError(1062, fn () => DB::table('meter_reading_submissions')->where('id', $submission->id)->update(['status' => 'pending']));
        $this->assertSame('rejected', $submission->fresh()->getRawOriginal('status'));
        $this->assertSame(MeterReadingSubmissionStatus::Rejected, $submission->fresh()->status);
        $nextPeriod = $duplicate;
        $nextPeriod['period'] = '2026-11-01';
        DB::table('meter_reading_submissions')->insert($nextPeriod);
        $otherService = Service::factory()->metered('U2_WATER', 'm3')->create();
        DB::table('meter_reading_submissions')->insert(array_replace($duplicate, ['service_id' => $otherService->id]));
        $this->assertSame(4, DB::table('meter_reading_submissions')->count());
        $this->assertSame(0, MeterReading::count(), 'Submission history must not create official readings.');
        $this->assertSame(0, DB::table('invoices')->count());
        $this->assertSame(0, DB::table('payments')->count());
    }

    public function test_approved_reading_reference_is_unique_and_all_six_foreign_keys_restrict_history(): void
    {
        $first = $this->submission();
        $reading = MeterReading::factory()->create(['room_id' => $first->room_id, 'contract_id' => $first->contract_id, 'service_id' => $first->service_id]);
        DB::table('meter_reading_submissions')->where('id', $first->id)->update(['status' => 'approved', 'approved_meter_reading_id' => $reading->id]);
        $second = $this->submission();
        $this->assertSqlError(1062, fn () => DB::table('meter_reading_submissions')->where('id', $second->id)->update(['approved_meter_reading_id' => $reading->id]));
        $reviewer = User::factory()->role(UserRole::Admin)->create();
        DB::table('meter_reading_submissions')->where('id', $first->id)->update(['reviewed_by' => $reviewer->id]);
        $first = $first->fresh();
        $this->assertSame(MeterReadingSubmissionStatus::Approved, $first->status);
        $this->assertSame($reading->id, $first->approvedMeterReading->id);
        $this->assertSame($reviewer->id, $first->reviewer->id);
        $references = ['room_id' => ['rooms', $first->room_id], 'contract_id' => ['contracts', $first->contract_id],
            'service_id' => ['services', $first->service_id], 'submitted_by' => ['users', $first->submitted_by],
            'reviewed_by' => ['users', $reviewer->id], 'approved_meter_reading_id' => ['meter_readings', $reading->id]];
        foreach ($references as $column => [$table, $id]) {
            $constraint = DB::selectOne('SELECT k.REFERENCED_TABLE_NAME AS parent, r.DELETE_RULE AS rule_name FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME=? AND k.COLUMN_NAME=?', ['meter_reading_submissions', $column]);
            $this->assertSame($table, $constraint->parent);
            $this->assertSame('RESTRICT', $constraint->rule_name);
            $this->assertSqlError(1451, fn () => DB::table($table)->where('id', $id)->delete());
        }
        $this->assertSqlError(1452, fn () => DB::table('meter_reading_submissions')->where('id', $first->id)->update(['reviewed_by' => 999999999]));
    }

    public function test_model_casts_relations_and_guarded_server_fields(): void
    {
        $submission = $this->submission('99999999.99');
        $this->assertSame('99999999.99', $submission->current_reading);
        $this->assertSame(MeterReadingSubmissionStatus::Pending, $submission->status);
        $this->assertSame('2026-10-01', $submission->period->format('Y-m-d'));
        $this->assertSame($submission->submitted_by, $submission->submitter->id);
        $this->assertSame($submission->room_id, $submission->room->id);
        $this->assertSame($submission->contract_id, $submission->contract->id);
        $this->assertSame($submission->service_id, $submission->service->id);
        $this->assertNull($submission->reviewer);
        $this->assertNull($submission->approvedMeterReading);
        $this->assertSame('meter_reading_submission', $submission->getMorphClass());
        foreach (['room_id', 'contract_id', 'service_id', 'submitted_by', 'reviewed_by', 'reviewed_at', 'status', 'rejection_reason', 'approved_meter_reading_id', 'pending_slot', 'id'] as $field) {
            $this->assertFalse($submission->isFillable($field), $field);
        }
        $attachment = $this->photo($submission);
        $this->assertSame($submission->id, $attachment->attachable->id);
        $this->assertSame([$attachment->id], $submission->attachments->modelKeys());
        $this->assertArrayNotHasKey('path', $attachment->toArray());
        foreach (['path', 'disk', 'attachable_id', 'attachable_type', 'collection', 'original_name', 'mime_type', 'size_bytes'] as $field) {
            $this->assertFalse($attachment->isFillable($field), $field);
        }
        $this->assertSqlError(1264, fn () => DB::table('attachments')->where('id', $attachment->id)->update(['size_bytes' => -1]));
    }

    public function test_policy_allows_only_active_admin_or_resident_owner_to_read_private_evidence(): void
    {
        $submission = $this->submission();
        $photo = $this->photo($submission);
        $owner = $submission->submitter;
        $this->assertFalse(Gate::allows('view', $submission));
        $this->assertFalse(Gate::allows('view', $photo));
        $this->assertTrue(Gate::forUser($owner)->allows('view', $submission));
        $this->assertTrue(Gate::forUser($owner)->allows('view', $photo));
        $this->assertFalse(Gate::forUser($owner)->allows('review', $submission));
        foreach (UserRole::cases() as $role) {
            $other = User::factory()->role($role)->create();
            $allowed = $role === UserRole::Admin;
            $this->assertSame($allowed, Gate::forUser($other)->allows('view', $submission), $role->value);
            $this->assertSame($allowed, Gate::forUser($other)->allows('view', $photo), $role->value);
            $this->assertSame($allowed, Gate::forUser($other)->allows('review', $submission), $role->value);
            $other->status = UserStatus::Locked;
            $this->assertFalse(Gate::forUser($other)->allows('view', $photo));
        }
        $owner->status = UserStatus::Locked;
        $this->assertFalse(Gate::forUser($owner)->allows('view', $submission));
        $this->assertFalse(Gate::forUser($owner)->allows('view', $photo));
    }

    public function test_creation_requires_active_residency_but_history_remains_readable_after_termination(): void
    {
        $submission = $this->submission();
        $owner = $submission->submitter;
        $this->assertTrue(Gate::forUser($owner)->allows('create', MeterReadingSubmission::class));
        $owner->status = UserStatus::Locked;
        $this->assertFalse(Gate::forUser($owner)->allows('create', MeterReadingSubmission::class));
        $owner->status = UserStatus::Active;
        $contract = $submission->contract;
        $contract->status = ContractStatus::Terminated;
        $contract->save();
        $this->assertFalse(Gate::forUser($owner)->allows('create', MeterReadingSubmission::class));
        $this->assertTrue(Gate::forUser($owner)->allows('view', $submission));
        $this->assertTrue(Gate::forUser($owner)->allows('view', $this->photo($submission)));
        foreach (UserRole::cases() as $role) {
            $user = User::factory()->role($role)->create();
            $this->assertFalse(Gate::forUser($user)->allows('create', MeterReadingSubmission::class));
            if ($role !== UserRole::Resident) {
                Contract::factory()->active()->create(['user_id' => $user->id]);
                $this->assertFalse(Gate::forUser($user)->allows('create', MeterReadingSubmission::class), 'An active contract must not substitute for resident role.');
            }
        }
    }

    public function test_other_disks_collections_parents_and_orphans_are_denied_even_for_admin(): void
    {
        $submission = $this->submission();
        $admin = User::factory()->role(UserRole::Admin)->create();
        foreach ([['disk' => 'public'], ['collection' => 'payment_proof'], ['attachable_type' => 'user'], ['attachable_id' => 999999999]] as $overrides) {
            $photo = $this->photo($submission, $overrides);
            $this->assertFalse(Gate::forUser($admin)->allows('view', $photo));
        }
        $disk = config('filesystems.disks.private');
        $this->assertSame('local', $disk['driver']);
        $this->assertSame(storage_path('app/evidence'), $disk['root']);
        $this->assertSame('private', $disk['visibility']);
        $this->assertFalse($disk['serve']);
        $this->assertTrue($disk['throw']);
        $this->assertArrayNotHasKey('url', $disk);
        $this->assertNotContains($disk['root'], array_values(config('filesystems.links')));
    }

    public function test_rollback_refuses_history_and_orphan_attachment_metadata_without_changing_rows(): void
    {
        $submission = $this->submission();
        $photo = $this->photo($submission);
        $before = $submission->getRawOriginal();
        foreach ([self::SUBMISSIONS, self::ATTACHMENTS] as $path) {
            try {
                (require database_path($path))->down();
                $this->fail('Rollback must preserve history.');
            } catch (RuntimeException $exception) {
                $this->assertStringContainsString('Không rollback', $exception->getMessage());
            }
        }
        $this->assertSame($before, $submission->fresh()->getRawOriginal());
        DB::table('meter_reading_submissions')->where('id', $submission->id)->delete();
        try {
            (require database_path(self::SUBMISSIONS))->down();
            $this->fail('Polymorphic evidence must not become orphaned by rollback.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('metadata ảnh', $exception->getMessage());
        }
        $this->assertTrue(Schema::hasTable('meter_reading_submissions'));
        $this->assertTrue(Attachment::whereKey($photo->id)->exists());
    }

    private function submission(string $reading = '112.35'): MeterReadingSubmission
    {
        $owner = User::factory()->role(UserRole::Resident)->create();
        $contract = Contract::factory()->active()->create(['user_id' => $owner->id]);
        $service = Service::factory()->metered('U2_POWER_'.$owner->id, 'kWh')->create();
        $submission = new MeterReadingSubmission(['period' => '2026-10-01', 'reading_date' => '2026-11-01', 'current_reading' => $reading]);
        $submission->room_id = $contract->room_id;
        $submission->contract_id = $contract->id;
        $submission->service_id = $service->id;
        $submission->submitted_by = $owner->id;
        $submission->save();

        return $submission->fresh();
    }

    /** @param array<string, mixed> $overrides */
    private function photo(MeterReadingSubmission $submission, array $overrides = []): Attachment
    {
        $photo = new Attachment;
        foreach (array_replace(['attachable_type' => 'meter_reading_submission', 'attachable_id' => $submission->id,
            'collection' => Attachment::METER_READING_PHOTO, 'disk' => 'private', 'path' => 'meter-readings/test/photo.png',
            'original_name' => 'test.png', 'mime_type' => 'image/png', 'size_bytes' => 100], $overrides) as $field => $value) {
            $photo->{$field} = $value;
        }
        $photo->save();

        return $photo->fresh();
    }

    private function assertSqlError(int $code, callable $action): void
    {
        try {
            $action();
            $this->fail('Expected SQL constraint to reject the operation.');
        } catch (QueryException $exception) {
            $this->assertSame($code, $exception->errorInfo[1] ?? null);
        }
    }
}
