<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ContractInspectionApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private array $migrations = [];

    private bool $transaction = false;

    private ?int $legacyContractId = null;

    private ?int $legacyRoomId = null;

    private ?int $legacyBuildingId = null;

    private ?int $legacyTenantId = null;

    private ?object $legacySnapshot = null;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-30 08:00:00 UTC');
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasTable('attachments'), 'M19 test schema already exists; refusing to layer or overwrite it.');
        $this->assertFalse(Schema::hasColumn('contracts', 'inspection_result'), 'P6 test schema already exists; refusing to layer or overwrite it.');
        foreach ([
            '2026_10_14_400019_create_attachments_table.php',
        ] as $file) {
            $migration = require database_path('migrations/pending/'.$file);
            $migration->up();
            $this->migrations[] = $migration;
        }
        $legacy = Contract::factory()->active()->create(['deposit_amount' => 0]);
        $legacyRoom = $legacy->room()->firstOrFail();
        $this->legacyContractId = $legacy->id;
        $this->legacyRoomId = $legacyRoom->id;
        $this->legacyBuildingId = $legacyRoom->building_id;
        $this->legacyTenantId = $legacy->user_id;
        $this->legacySnapshot = DB::table('contracts')->where('id', $legacy->id)
            ->first(['status', 'room_id', 'user_id', 'start_date', 'end_date', 'monthly_rent', 'deposit_amount']);
        $inspectionMigration = require database_path('migrations/pending/2026_10_30_400021_add_contract_inspection_fields.php');
        $inspectionMigration->up();
        $this->migrations[] = $inspectionMigration;
        DB::beginTransaction();
        $this->transaction = true;
        Storage::fake('private');
        $this->initializeSpaClient();
    }

    protected function tearDown(): void
    {
        try {
            if ($this->transaction) {
                $this->assertSame(1, DB::transactionLevel());
                DB::rollBack();
            }
            if ($this->legacyContractId !== null) {
                DB::table('contracts')->where('id', $this->legacyContractId)->delete();
                DB::table('rooms')->where('id', $this->legacyRoomId)->delete();
                DB::table('buildings')->where('id', $this->legacyBuildingId)->delete();
                DB::table('users')->where('id', $this->legacyTenantId)->delete();
            }
            foreach (array_reverse($this->migrations) as $migration) {
                $migration->down();
            }
            Storage::disk('private')->deleteDirectory('contract-inspections');
        } finally {
            Carbon::setTestNow();
            parent::tearDown();
        }
    }

    private function login(UserRole $role, string $phone): User
    {
        $user = User::factory()->role($role)->create(['phone' => $phone, 'password' => 'Inspection test only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $phone, 'password' => 'Inspection test only!42'])->assertOk();

        return $user;
    }

    private function contract(User $tenant): Contract
    {
        return Contract::factory()->active()->create(['user_id' => $tenant->id, 'deposit_amount' => 0]);
    }

    private function photo(string $name = 'inspection.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
    }

    /** DB-D98: "Có hư hỏng" phải có ghi chú mô tả; "Không có hư hỏng" vẫn để trống được. Ảnh không bắt buộc ở bước này. */
    public function test_damaged_inspection_requires_a_note_but_no_damage_does_not(): void
    {
        $this->login(UserRole::Admin, '0900081011');
        $tenant = User::factory()->role(UserRole::Resident)->create(['phone' => '0900081012']);
        $contract = $this->contract($tenant);
        $url = '/api/v1/contracts/'.$contract->id.'/inspection';
        $revision = fn () => $contract->fresh()->load('contractServices')->lifecycleRevision();

        foreach ([[], ['inspection_note' => null], ['inspection_note' => '   ']] as $note) {
            $this->spa('POST', $url, ['inspection_result' => 'damaged', 'expected_revision' => $revision(), ...$note])
                ->assertUnprocessable()->assertJsonValidationErrors(['inspection_note' => 'Vui lòng ghi rõ hư hỏng khi chọn "Có hư hỏng".']);
        }
        $this->assertNull($contract->fresh()->inspection_result);
        $this->assertDatabaseMissing('attachments', ['attachable_type' => 'contract', 'attachable_id' => $contract->id]);

        $this->spa('POST', $url, ['inspection_result' => 'no_damage', 'expected_revision' => $revision()])
            ->assertOk()->assertJsonPath('data.inspection_result', 'no_damage')->assertJsonPath('data.inspection_note', null);
        $this->spa('POST', $url, ['inspection_result' => 'damaged', 'inspection_note' => 'Trầy cửa tủ.', 'expected_revision' => $revision()])
            ->assertOk()->assertJsonPath('data.inspection_result', 'damaged')->assertJsonPath('data.inspection_photos', []);
    }

    public function test_admin_records_inspection_and_owner_can_view_private_photos(): void
    {
        $admin = $this->login(UserRole::Admin, '0900081001');
        $tenant = User::factory()->role(UserRole::Resident)->create(['phone' => '0900081002', 'password' => 'Inspection test only!42']);
        $contract = $this->contract($tenant);
        $roomBefore = $contract->room()->firstOrFail()->getRawOriginal();
        $url = '/api/v1/contracts/'.$contract->id.'/inspection';

        $response = $this->spa('POST', $url, [
            'inspection_result' => 'damaged', 'inspection_note' => 'Vết nứt ở bồn rửa.',
            'expected_revision' => $contract->fresh()->load('contractServices')->lifecycleRevision(),
        ], files: ['photos' => [$this->photo()]]);

        $response->assertOk()->assertJsonPath('data.status', 'active')->assertJsonPath('data.inspection_result', 'damaged')
            ->assertJsonPath('data.inspection_note', 'Vết nứt ở bồn rửa.')->assertJsonPath('data.inspected_by', $admin->id)
            ->assertJsonPath('data.inspection_photos.0.mime_type', 'image/png');
        $photo = $response->json('data.inspection_photos.0');
        $this->assertNotNull($photo['id']);
        $this->assertSame($roomBefore, $contract->room()->firstOrFail()->getRawOriginal());
        $this->assertDatabaseHas('attachments', ['id' => $photo['id'], 'attachable_type' => 'contract',
            'attachable_id' => $contract->id, 'collection' => 'inspection_photo', 'disk' => 'private']);

        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $tenant->phone, 'password' => 'Inspection test only!42'])->assertOk();
        $detail = $this->spa('GET', '/api/v1/resident/contracts/'.$contract->id)->assertOk()
            ->assertJsonPath('data.inspection_result', 'damaged')->assertJsonPath('data.inspection_photos.0.id', $photo['id']);
        $this->assertSame($photo['url'], $detail->json('data.inspection_photos.0.url'));
        $download = $this->spa('GET', $photo['url'])->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->assertStringContainsString('private', $download->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', $download->headers->get('Cache-Control'));

        $this->login(UserRole::Resident, '0900081003');
        $this->spa('GET', $photo['url'])->assertNotFound();
    }

    public function test_pending_inspection_migration_preserves_existing_contract_data(): void
    {
        $after = DB::table('contracts')->where('id', $this->legacyContractId)
            ->first(['status', 'room_id', 'user_id', 'start_date', 'end_date', 'monthly_rent', 'deposit_amount']);
        $this->assertEquals($this->legacySnapshot, $after);
        $inspection = DB::table('contracts')->where('id', $this->legacyContractId)
            ->first(['inspection_result', 'inspected_by', 'inspected_at', 'inspection_note']);
        $this->assertEquals((object) ['inspection_result' => null, 'inspected_by' => null, 'inspected_at' => null, 'inspection_note' => null], $inspection);
    }

    public function test_inspection_requires_admin_valid_input_active_contract_and_current_revision(): void
    {
        $tenant = User::factory()->role(UserRole::Resident)->create(['phone' => '0900081010']);
        $contract = $this->contract($tenant);
        $url = '/api/v1/contracts/'.$contract->id.'/inspection';
        $input = ['inspection_result' => 'no_damage', 'inspection_note' => '',
            'expected_revision' => $contract->fresh()->load('contractServices')->lifecycleRevision()];
        $this->spa('POST', $url, $input)->assertUnauthorized();
        $this->login(UserRole::Resident, '0900081011');
        $this->spa('POST', $url, $input)->assertForbidden();

        $this->login(UserRole::Admin, '0900081012');
        $this->spa('POST', $url, array_replace($input, ['inspection_result' => 'unknown']))->assertUnprocessable()
            ->assertJsonValidationErrors('inspection_result');
        $this->spa('POST', $url, $input + ['inspected_by' => 1])->assertUnprocessable()->assertJsonValidationErrors('inspected_by');
        $this->spa('POST', $url, $input, files: ['photos' => array_map(fn ($i) => $this->photo('photo-'.$i.'.png'), range(1, 6))])
            ->assertUnprocessable()->assertJsonValidationErrors('photos');

        $saved = $this->spa('POST', $url, $input)->assertOk()->assertJsonPath('data.inspection_result', 'no_damage');
        $this->spa('POST', $url, $input, files: ['photos' => [$this->photo()]])->assertConflict();
        $this->assertSame([], Storage::disk('private')->allFiles('contract-inspections'));
        $contract->refresh();
        $this->assertSame('active', $contract->status->value);
        $this->assertSame('no_damage', $saved->json('data.inspection_result'));

        $contract->status = 'terminated';
        $contract->save();
        $this->spa('POST', $url, array_replace($input, ['expected_revision' => $contract->fresh()->load('contractServices')->lifecycleRevision()]))
            ->assertConflict();
    }

    public function test_invalid_and_unavailable_private_photos_are_not_exposed(): void
    {
        $admin = $this->login(UserRole::Admin, '0900081020');
        $tenant = User::factory()->role(UserRole::Resident)->create(['phone' => '0900081021']);
        $contract = $this->contract($tenant);
        $url = '/api/v1/contracts/'.$contract->id.'/inspection';
        $input = ['inspection_result' => 'no_damage', 'inspection_note' => '',
            'expected_revision' => $contract->fresh()->load('contractServices')->lifecycleRevision()];
        $this->spa('POST', $url, $input, files: ['photos' => [UploadedFile::fake()->createWithContent('bad.svg', '<svg/>')]])
            ->assertUnprocessable()->assertJsonValidationErrors('photos.0');

        $response = $this->spa('POST', $url, $input, files: ['photos' => [$this->photo()]])->assertOk();
        $photo = $response->json('data.inspection_photos.0');
        $this->assertNotEmpty($photo['url']);
        $this->login(UserRole::Technician, '0900081022');
        $this->spa('GET', $photo['url'])->assertNotFound();
        $this->spa('GET', '/api/v1/contracts/999999/attachments/'.$photo['id'])->assertNotFound();
    }
}
