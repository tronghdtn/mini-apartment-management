<?php

namespace Tests\Feature\Utilities;

use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\MeterReadingSubmission;
use App\Models\Service;
use App\Models\User;
use App\Services\MeterReadingService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class MeterReadingSubmissionApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private const MIGRATIONS = ['2026_10_27_000002_scope_utility_prices_to_buildings.php',
        '2026_10_28_000001_scope_final_meter_readings_to_contracts.php',
        '2026_10_14_400019_create_attachments_table.php', '2026_10_27_000003_create_meter_reading_submissions_table.php'];

    private array $schema = [];

    private bool $fixtures = false;

    private array $uploads = [];

    private User $resident;

    private Contract $contract;

    private Service $power;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        foreach (self::MIGRATIONS as $name) {
            $migration = require database_path('migrations/pending/'.$name);
            $migration->up();
            $this->schema[] = $migration;
        }
        DB::beginTransaction();
        $this->fixtures = true;
        Storage::fake('private');
        $this->initializeSpaClient();
        $this->resident = User::factory()->role(UserRole::Resident)->create(['password' => 'U2 Test only!42']);
        $this->contract = Contract::factory()->active()->create(['user_id' => $this->resident->id, 'start_date' => '2026-10-01']);
        $this->power = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $this->contract->contractServices()->create(['service_id' => $this->power->id, 'quantity' => '1.00', 'unit_price' => null, 'start_date' => '2026-10-01']);
        DB::table('utility_prices')->insert(['building_id' => $this->contract->room->building_id, 'service_id' => $this->power->id,
            'unit_price' => 3500, 'effective_from' => '2026-10-01']);
    }

    protected function tearDown(): void
    {
        try {
            if ($this->fixtures) {
                $this->assertSame(1, DB::transactionLevel());
                DB::rollBack();
            }
            foreach (array_reverse($this->schema) as $migration) {
                $migration->down();
            }
        } finally {
            parent::tearDown();
        }
    }

    private function login(?User $user = null): User
    {
        $user ??= $this->resident;
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'U2 Test only!42'])->assertOk();

        return $user;
    }

    private function admin(): User
    {
        return User::factory()->role(UserRole::Admin)->create(['password' => 'U2 Test only!42']);
    }

    private function entry(array $overrides = []): array
    {
        return ['service_id' => (string) $this->power->id, 'period' => '2026-10-01', 'reading_date' => '2026-11-01', 'current_reading' => '112.35', ...$overrides];
    }

    private function image(): UploadedFile
    {
        return $this->file('meter.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
    }

    private function file(string $name, string $contents): UploadedFile
    {
        // Laravel's fake File guesses MIME from the name; use actual finfo for upload validation.
        $fake = UploadedFile::fake()->createWithContent($name, $contents);
        $this->uploads[] = $fake;

        return new UploadedFile($fake->getPathname(), $name, null, null, true);
    }

    private function upload(array $overrides = [], ?UploadedFile $file = null, bool $csrf = true): TestResponse
    {
        return $this->spa('POST', '/api/v1/meter-reading-submissions', $this->entry($overrides), sendCsrf: $csrf, files: ['photo' => $file ?? $this->image()]);
    }

    public function test_guest_other_roles_and_csrf_cannot_submit_or_review(): void
    {
        $this->spa('GET', '/api/v1/meter-reading-submissions')->assertUnauthorized();
        $this->upload()->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Technician, UserRole::Guard, UserRole::Admin] as $role) {
            $user = User::factory()->role($role)->create(['password' => 'U2 Test only!42']);
            $this->login($user);
            $this->upload()->assertForbidden();
            if ($role !== UserRole::Admin) {
                $this->spa('GET', '/api/v1/meter-reading-submissions')->assertForbidden();
            }
        }
        $this->login();
        $this->upload(csrf: false)->assertStatus(419);
        $this->assertDatabaseCount('meter_reading_submissions', 0);
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_submission_is_private_pending_owned_and_does_not_create_financial_records(): void
    {
        $this->login();
        $this->spa('GET', '/api/v1/meter-reading-submissions/context')->assertOk()->assertJsonPath('data.contract_id', $this->contract->id)
            ->assertJsonCount(1, 'data.services')->assertJsonPath('data.services.0.id', $this->power->id)
            ->assertJsonMissingPath('data.services.0.billing_type');
        $response = $this->upload()->assertCreated()->assertJsonPath('data.status', 'pending')->assertJsonPath('data.current_reading', '112.35');
        $id = $response->json('data.id');
        $this->assertDatabaseHas('meter_reading_submissions', ['id' => $id, 'submitted_by' => $this->resident->id, 'room_id' => $this->contract->room_id]);
        $this->assertDatabaseCount('meter_readings', 0);
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('payments', 0);
        $attachment = Attachment::sole();
        Storage::disk('private')->assertExists($attachment->path);
        $this->assertStringNotContainsString($attachment->path, $response->getContent());
        $this->spa('GET', "/api/v1/meter-reading-submissions/$id/photo")->assertOk()->assertHeader('Content-Type', 'image/png')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->spa('POST', "/api/v1/meter-reading-submissions/$id/approve")->assertForbidden();
        $other = User::factory()->role(UserRole::Resident)->create(['password' => 'U2 Test only!42']);
        $this->login($other);
        $this->spa('GET', '/api/v1/meter-reading-submissions')->assertOk()->assertJsonCount(0, 'data');
        foreach (['', '/photo'] as $suffix) {
            $this->spa('GET', "/api/v1/meter-reading-submissions/$id$suffix")->assertForbidden();
        }
        $this->login();
        $this->upload()->assertConflict();
        $this->assertCount(1, Storage::disk('private')->allFiles());
    }

    public function test_invalid_fields_image_and_baseline_leave_no_files_or_rows(): void
    {
        $this->login();
        foreach ([['room_id' => 1], ['contract_id' => 1], ['status' => 'approved'], ['amount' => 1],
            ['current_reading' => '-1'], ['current_reading' => '1.001'], ['current_reading' => '99.99'], ['period' => '2026-10-02']] as $bad) {
            $this->upload($bad)->assertUnprocessable();
        }
        $this->upload(file: $this->file('meter.jpg', 'not an image'))->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->upload(file: $this->file('meter.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'))->assertUnprocessable();
        $this->upload(file: $this->file('large.png', $this->image()->getContent().str_repeat('x', 5121 * 1024)))->assertUnprocessable();
        $this->assertDatabaseCount('meter_reading_submissions', 0);
        $this->assertDatabaseCount('attachments', 0);
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_approval_uses_mtr_once_and_replays_preserve_review_timestamp(): void
    {
        $this->login();
        $id = $this->upload()->assertCreated()->json('data.id');
        $admin = $this->login($this->admin());
        $url = "/api/v1/meter-reading-submissions/$id/approve";
        $response = $this->spa('POST', $url)->assertOk()->assertJsonPath('data.status', 'approved')->assertJsonPath('data.reviewed_by', $admin->id);
        $readingId = $response->json('data.approved_meter_reading_id');
        $time = $response->json('data.reviewed_at');
        $this->assertDatabaseHas('meter_readings', ['id' => $readingId, 'contract_id' => $this->contract->id, 'previous_reading' => '100.00', 'current_reading' => '112.35', 'amount' => 43225]);
        $this->spa('POST', $url)->assertOk()->assertJsonPath('data.approved_meter_reading_id', $readingId)->assertJsonPath('data.reviewed_at', $time);
        DB::table('services')->where('id', $this->power->id)->update(['status' => 'inactive']);
        $this->spa('POST', $url)->assertOk()->assertJsonPath('data.approved_meter_reading_id', $readingId)->assertJsonPath('data.reviewed_at', $time);
        $this->spa('POST', "/api/v1/meter-reading-submissions/$id/reject", ['rejection_reason' => 'Không đảo'])->assertConflict();
        $this->assertDatabaseCount('meter_readings', 1);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_rejection_requires_reason_preserves_history_and_allows_resubmission(): void
    {
        $this->login();
        $id = $this->upload()->assertCreated()->json('data.id');
        $this->login($this->admin());
        $url = "/api/v1/meter-reading-submissions/$id/reject";
        $this->spa('POST', $url, ['rejection_reason' => '   '])->assertUnprocessable();
        $this->spa('POST', $url, ['rejection_reason' => 'Ảnh chưa rõ'])->assertOk()->assertJsonPath('data.status', 'rejected')->assertJsonPath('data.rejection_reason', 'Ảnh chưa rõ');
        $this->spa('POST', $url, ['rejection_reason' => 'Lặp'])->assertConflict();
        $this->spa('POST', "/api/v1/meter-reading-submissions/$id/approve")->assertConflict();
        $this->login();
        $this->upload()->assertCreated();
        $this->spa('GET', '/api/v1/meter-reading-submissions')->assertOk()->assertJsonCount(2, 'data');
        $this->assertDatabaseCount('meter_readings', 0);
        $this->assertCount(2, Storage::disk('private')->allFiles());
    }

    public function test_direct_entry_or_missing_photo_blocks_approval_without_partial_state(): void
    {
        $this->login();
        $id = $this->upload()->assertCreated()->json('data.id');
        $this->login($this->admin());
        $photo = Attachment::sole();
        Storage::disk('private')->delete($photo->path);
        $this->spa('POST', "/api/v1/meter-reading-submissions/$id/approve")->assertConflict();
        $this->assertDatabaseCount('meter_readings', 0);
        Storage::disk('private')->put($photo->path, $this->image()->getContent());
        app(MeterReadingService::class)->storeBatch([['room_id' => $this->contract->room_id, ...$this->entry()]]);
        $this->spa('POST', "/api/v1/meter-reading-submissions/$id/approve")->assertConflict();
        $this->assertDatabaseHas('meter_reading_submissions', ['id' => $id, 'status' => 'pending', 'approved_meter_reading_id' => null]);
        $this->assertDatabaseCount('meter_readings', 1);
    }

    public function test_terminated_owner_retains_read_access_but_cannot_submit_or_approve(): void
    {
        $this->login();
        $id = $this->upload()->assertCreated()->json('data.id');
        DB::table('contracts')->where('id', $this->contract->id)->update(['status' => 'terminated', 'actual_end_date' => '2026-11-01']);
        $this->spa('GET', "/api/v1/meter-reading-submissions/$id")->assertOk();
        $this->spa('GET', "/api/v1/meter-reading-submissions/$id/photo")->assertOk();
        $this->upload()->assertForbidden();
        $this->login($this->admin());
        $this->spa('POST', "/api/v1/meter-reading-submissions/$id/approve")->assertConflict();
        $this->assertSame('pending', MeterReadingSubmission::findOrFail($id)->status->value);
        $this->assertDatabaseCount('meter_readings', 0);
    }

    public function test_all_review_photo_permissions_locked_account_and_forged_review_fields(): void
    {
        $this->login();
        $id = $this->upload()->assertCreated()->json('data.id');
        foreach ([UserRole::User, UserRole::Technician, UserRole::Guard, UserRole::Resident] as $role) {
            $other = User::factory()->role($role)->create(['password' => 'U2 Test only!42']);
            $this->login($other);
            foreach (['', '/photo'] as $suffix) {
                $this->spa('GET', "/api/v1/meter-reading-submissions/$id$suffix")->assertForbidden();
            }
            foreach (['approve', 'reject'] as $action) {
                $this->spa('POST', "/api/v1/meter-reading-submissions/$id/$action", ['amount' => 1])->assertForbidden();
            }
        }
        $this->login($this->admin());
        $this->spa('POST', "/api/v1/meter-reading-submissions/$id/approve", sendCsrf: false)->assertStatus(419);
        $this->spa('POST', "/api/v1/meter-reading-submissions/$id/approve", ['current_reading' => '999'])->assertUnprocessable();
        $this->spa('POST', "/api/v1/meter-reading-submissions/$id/reject", ['rejection_reason' => 'Hỏng', 'reviewed_by' => 1])->assertUnprocessable();
        $this->login();
        DB::table('users')->where('id', $this->resident->id)->update(['status' => 'locked']);
        $this->spa('GET', "/api/v1/meter-reading-submissions/$id/photo")->assertForbidden();
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
        $this->assertDatabaseCount('meter_readings', 0);
    }
}
