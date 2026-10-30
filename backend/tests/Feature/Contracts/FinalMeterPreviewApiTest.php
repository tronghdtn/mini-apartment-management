<?php

namespace Tests\Feature\Contracts;

use App\Enums\EarlyTerminationFeeType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Contract;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractService;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class FinalMeterPreviewApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private const U1 = '2026_10_27_000002_scope_utility_prices_to_buildings.php';

    private const U3 = '2026_10_28_000001_scope_final_meter_readings_to_contracts.php';

    private array $schema = [];

    private bool $fixtureTransaction = false;

    private Service $power;

    private Service $water;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-10-30 08:00:00 UTC');
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasColumn('utility_prices', 'building_id'));
        $this->assertFalse(Schema::hasColumn('meter_readings', 'final_contract_id'));
        $this->assertSame(0, DB::table('utility_prices')->count(), 'Refusing to scope nonempty shared test prices.');
        foreach ([self::U1, self::U3] as $file) {
            $migration = require database_path('migrations/pending/'.$file);
            $migration->up();
            $this->schema[] = $migration;
        }
        foreach (['2026_10_14_400019_create_attachments_table.php', '2026_10_30_400021_add_contract_inspection_fields.php'] as $file) {
            $migration = require database_path('migrations/pending/'.$file);
            $migration->up();
            $this->schema[] = $migration;
        }
        DB::beginTransaction();
        $this->fixtureTransaction = true;
        Storage::fake('private');
        $this->initializeSpaClient();
        $this->power = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $this->water = Service::factory()->metered('WATER', 'm3')->create();
    }

    protected function tearDown(): void
    {
        try {
            if ($this->fixtureTransaction) {
                $this->assertSame(1, DB::transactionLevel(), 'DDL must stay outside fixtures.');
                DB::rollBack();
            }
            foreach (array_reverse($this->schema) as $migration) {
                $migration->down();
            }
        } finally {
            CarbonImmutable::setTestNow();
            parent::tearDown();
        }
    }

    private function login(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Final meter test only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Final meter test only!42'])->assertOk();

        return $user;
    }

    private function contract(): Contract
    {
        $tenant = User::factory()->role(UserRole::Resident)->create();
        $contract = Contract::factory()->active()->create([
            'user_id' => $tenant->id, 'start_date' => '2026-08-01', 'end_date' => '2026-10-30',
            'monthly_rent' => 3_100_000, 'initial_electricity_reading' => '100.00', 'initial_water_reading' => '10.00',
            'early_termination_fee_type' => 'none',
        ]);
        foreach ([$this->power, $this->water] as $service) {
            $contract->contractServices()->create(['service_id' => $service->id, 'quantity' => '1.00', 'unit_price' => null,
                'start_date' => '2026-08-01']);
            foreach ([['2026-08-01', $service->id === $this->power->id ? 3000 : 12000],
                ['2026-09-01', $service->id === $this->power->id ? 3200 : 13000],
                ['2026-10-01', $service->id === $this->power->id ? 3500 : 15000]] as [$effectiveFrom, $unitPrice]) {
                DB::table('utility_prices')->insert(['building_id' => $contract->room->building_id, 'service_id' => $service->id,
                    'unit_price' => $unitPrice, 'effective_from' => $effectiveFrom]);
            }
        }
        $this->periodic($contract, $this->power, '2026-08-01', '2026-09-01', '100.00', '110.00', 3000);
        $this->periodic($contract, $this->power, '2026-09-01', '2026-10-01', '110.00', '120.00', 3200);
        $this->periodic($contract, $this->water, '2026-08-01', '2026-09-01', '10.00', '11.00', 12000);
        $this->periodic($contract, $this->water, '2026-09-01', '2026-10-01', '11.00', '12.00', 13000);

        return app(ContractService::class)->find($contract->id);
    }

    private function periodic(Contract $contract, Service $service, string $period, string $date, string $previous, string $current, int $price): void
    {
        $consumption = bcsub($current, $previous, 2);
        DB::table('meter_readings')->insert(['contract_id' => $contract->id, 'room_id' => $contract->room_id,
            'service_id' => $service->id, 'kind' => 'periodic', 'period' => $period, 'reading_date' => $date,
            'previous_reading' => $previous, 'current_reading' => $current, 'consumption' => $consumption,
            'unit_price' => $price, 'amount' => Money::meterAmount($consumption, $price),
            'created_at' => now(), 'updated_at' => now()]);
    }

    private function input(Contract $contract, array $override = []): array
    {
        return ['actual_end_date' => '2026-10-30', 'closure_note' => 'Bàn giao theo lịch thử nghiệm.',
            'expected_revision' => $contract->lifecycleRevision(), 'electricity_reading' => '125.00', 'water_reading' => '13.00', ...$override];
    }

    public function test_admin_previews_final_meter_amounts_from_locked_u3_history_without_writing(): void
    {
        $contract = $this->contract();
        $this->login();
        $before = DB::table('meter_readings')->where('room_id', $contract->room_id)->orderBy('id')->get()->toArray();

        $response = $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-meter-preview', $this->input($contract));

        $response->assertOk()->assertJsonPath('data.closure_reason', 'early_termination')->assertJsonPath('data.early_termination_fee', 0)
            ->assertJsonPath('data.period', '2026-10-01')->assertJsonPath('data.meter_amount', 32_500)
            ->assertJsonPath('data.readings.0.service_code', 'ELECTRICITY')->assertJsonPath('data.readings.0.previous_reading', '120.00')
            ->assertJsonPath('data.readings.0.consumption', '5.00')->assertJsonPath('data.readings.0.unit_price', 3500)
            ->assertJsonPath('data.readings.0.amount', 17_500)->assertJsonPath('data.readings.1.service_code', 'WATER')
            ->assertJsonPath('data.readings.1.previous_reading', '12.00')->assertJsonPath('data.readings.1.consumption', '1.00')
            ->assertJsonPath('data.readings.1.amount', 15_000)->assertJsonPath('data.is_preview', true);

        $this->assertEquals($before, DB::table('meter_readings')->where('room_id', $contract->room_id)->orderBy('id')->get()->toArray());
        $this->assertSame(0, DB::table('invoices')->where('contract_id', $contract->id)->count());
        $this->assertSame('active', DB::table('contracts')->where('id', $contract->id)->value('status'));
    }

    public function test_preview_requires_admin_cookie_csrf_and_current_active_contract(): void
    {
        $contract = $this->contract();
        $input = $this->input($contract);
        $url = '/api/v1/contracts/'.$contract->id.'/final-meter-preview';
        $this->spa('POST', $url, $input)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('POST', $url, $input)->assertForbidden();
        }
        $this->login();
        $this->spa('POST', $url, $input, sendCsrf: false)->assertStatus(419);
        $this->spa('POST', $url, array_replace($input, ['expected_revision' => str_repeat('0', 64)]))->assertConflict();
        $contract->status = 'terminated';
        $contract->save();
        $this->spa('POST', $url, $input)->assertConflict();
    }

    public function test_preview_rejects_invalid_or_decreasing_readings_and_does_not_persist(): void
    {
        $contract = $this->contract();
        $this->login();
        $url = '/api/v1/contracts/'.$contract->id.'/final-meter-preview';
        foreach ([true, '-1', '1e3', '100000000', 'bad'] as $reading) {
            $this->spa('POST', $url, $this->input($contract, ['electricity_reading' => $reading]))
                ->assertUnprocessable()->assertJsonValidationErrors('electricity_reading');
        }
        $this->spa('POST', $url, $this->input($contract, ['electricity_reading' => '119.99']))
            ->assertUnprocessable()->assertJsonValidationErrors('electricity_reading');
        $this->assertDatabaseCount('meter_readings', 4);
        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_zero_consumption_is_a_valid_final_meter_amount(): void
    {
        $contract = $this->contract();
        $this->login();

        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-meter-preview',
            $this->input($contract, ['electricity_reading' => '120.00', 'water_reading' => '12.00']))
            ->assertOk()->assertJsonPath('data.meter_amount', 0)->assertJsonPath('data.readings.0.amount', 0)
            ->assertJsonPath('data.readings.1.amount', 0);
        $this->assertDatabaseCount('meter_readings', 4);
    }

    public function test_preview_blocks_gaps_later_meters_and_missing_building_prices(): void
    {
        $contract = $this->contract();
        $this->login();
        $url = '/api/v1/contracts/'.$contract->id.'/final-meter-preview';
        DB::table('meter_readings')->where('contract_id', $contract->id)->where('service_id', $this->water->id)->where('period', '2026-09-01')->delete();
        $this->spa('POST', $url, $this->input($contract))->assertUnprocessable()->assertJsonValidationErrors('water_reading');

        $this->periodic($contract, $this->water, '2026-09-01', '2026-10-01', '11.00', '12.00', 15000);
        $this->periodic($contract, $this->power, '2026-10-01', '2026-11-01', '120.00', '121.00', 3500);
        $contract->refresh()->setRelation('contractServices', $contract->contractServices()->orderBy('id')->get());
        $this->spa('POST', $url, $this->input($contract))->assertUnprocessable()->assertJsonValidationErrors('electricity_reading');

        DB::table('meter_readings')->where('contract_id', $contract->id)->where('service_id', $this->power->id)->where('period', '2026-10-01')->delete();
        DB::table('utility_prices')->where('building_id', $contract->room->building_id)->where('service_id', $this->water->id)->delete();
        $contract->refresh()->setRelation('contractServices', $contract->contractServices()->orderBy('id')->get());
        $this->spa('POST', $url, $this->input($contract))->assertUnprocessable()->assertJsonValidationErrors('water_reading');
    }

    public function test_final_draft_creates_final_meters_and_issues_the_full_unbilled_balance(): void
    {
        $contract = $this->contract();
        $this->login();
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'no_damage', 'expected_revision' => $contract->lifecycleRevision(),
        ])->assertOk();
        $contract = app(ContractService::class)->find($contract->id);

        $draft = $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $this->input($contract))
            ->assertCreated()->assertJsonPath('data.type', 'final')->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.total_amount', 9_219_500)->json('data');

        $this->assertSame(6, DB::table('meter_readings')->where('invoice_id', $draft['id'])->count());
        $this->assertSame(2, DB::table('meter_readings')->where('contract_id', $contract->id)->where('kind', 'final')->count());
        $this->assertDatabaseHas('contracts', ['id' => $contract->id, 'status' => 'active', 'actual_end_date' => '2026-10-30',
            'closure_reason' => 'early_termination']);
        $stagedContract = app(ContractService::class)->find($contract->id);
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'damaged', 'expected_revision' => $stagedContract->lifecycleRevision(),
        ])->assertConflict()->assertJsonPath('message', 'Không thể đổi kết quả kiểm kê sau khi đã lưu chỉ số chốt; hóa đơn lập lại phải giữ nguyên căn cứ đã ghi.');

        $refreshed = $this->spa('POST', '/api/v1/invoices/'.$draft['id'].'/refresh', ['expected_revision' => $draft['revision']])
            ->assertOk()->json('data');
        $this->assertSame(array_column($draft['items'], 'amount'), array_column($refreshed['items'], 'amount'));
        $issued = $this->spa('POST', '/api/v1/invoices/'.$draft['id'].'/issue', ['expected_revision' => $refreshed['revision']]);
        $this->assertSame(200, $issued->getStatusCode(), $issued->getContent());
        $issued->assertJsonPath('data.status', 'issued')->assertJsonPath('data.total_amount', 9_219_500);
    }

    public function test_final_draft_requires_inspection_damage_lines_and_private_evidence(): void
    {
        $contract = $this->contract();
        $this->login();
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $this->input($contract))
            ->assertConflict();
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'damaged', 'expected_revision' => $contract->lifecycleRevision(),
        ])->assertOk();
        $contract = app(ContractService::class)->find($contract->id);
        $input = $this->input($contract);

        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $input)->assertUnprocessable();
        $input['damages'] = [['description' => 'Kính cửa sổ', 'reason' => 'Nứt khi bàn giao', 'basis' => 'Báo giá K-10', 'amount' => 300_000]];
        $photo = UploadedFile::fake()->createWithContent('damage.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $extraPhoto = UploadedFile::fake()->createWithContent('extra.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $input, files: [
            'damage_photos' => [4 => [$extraPhoto]],
        ])->assertUnprocessable();
        $this->assertSame([], Storage::disk('private')->allFiles());
        $draft = $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $input, files: [
            'damage_photos' => [[$photo]],
        ])
            ->assertCreated()->assertJsonPath('data.total_amount', 9_519_500)->json('data');
        $damage = collect($draft['items'])->firstWhere('item_type', 'damage');
        $this->assertSame('Báo giá K-10', $damage['basis']);
        $this->assertCount(1, $damage['evidence_urls']);
        $this->assertSame(1, DB::table('attachments')->where('attachable_type', 'contract')->where('attachable_id', $contract->id)
            ->where('collection', 'damage_photo')->where('disk', 'private')->count());
        $this->spa('POST', '/api/v1/invoices/'.$draft['id'].'/issue', ['expected_revision' => $draft['revision']])->assertOk();
        $resident = User::findOrFail($contract->user_id);
        $resident->password = 'Final meter test only!42';
        $resident->save();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $resident->phone, 'password' => 'Final meter test only!42'])->assertOk();
        $this->spa('GET', '/api/v1/invoices/'.$draft['id'])->assertOk()->assertJsonFragment(['item_type' => 'damage']);
        $this->spa('GET', parse_url($damage['evidence_urls'][0], PHP_URL_PATH))->assertOk();
    }

    public function test_final_draft_allows_confirmed_historical_payment_without_treating_it_as_pending(): void
    {
        $contract = $this->contract();
        $this->login();
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'no_damage', 'expected_revision' => $contract->lifecycleRevision(),
        ])->assertOk();
        $contract = app(ContractService::class)->find($contract->id);
        $invoiceId = DB::table('invoices')->insertGetId([
            'contract_id' => $contract->id, 'type' => 'monthly', 'period' => '2026-09-01', 'status' => 'partially_paid',
            'total_amount' => 100_000, 'paid_amount' => 50_000, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('meter_readings')->where('contract_id', $contract->id)->where('period', '2026-08-01')->update(['invoice_id' => $invoiceId]);
        DB::table('payments')->insert([
            'invoice_id' => $invoiceId, 'amount' => 50_000, 'method' => 'bank_transfer', 'status' => 'confirmed',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $this->input($contract))
            ->assertCreated()->assertJsonPath('data.type', 'final')->assertJsonPath('data.status', 'draft');
    }

    public function test_final_draft_waits_for_pending_payment_reconciliation(): void
    {
        $contract = $this->contract();
        $this->login();
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'no_damage', 'expected_revision' => $contract->lifecycleRevision(),
        ])->assertOk();
        $contract = app(ContractService::class)->find($contract->id);
        $invoiceId = DB::table('invoices')->insertGetId([
            'contract_id' => $contract->id, 'type' => 'monthly', 'period' => '2026-09-01', 'status' => 'issued',
            'total_amount' => 100_000, 'paid_amount' => 0, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('payments')->insert([
            'invoice_id' => $invoiceId, 'amount' => 50_000, 'method' => 'bank_transfer', 'status' => 'pending',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $this->input($contract))
            ->assertConflict()->assertJsonPath('message', 'Cần đối soát hoặc từ chối khoản thanh toán đang chờ trước khi lập hóa đơn tất toán.');
        $this->assertDatabaseMissing('meter_readings', ['contract_id' => $contract->id, 'kind' => 'final']);
        $this->assertDatabaseMissing('invoices', ['contract_id' => $contract->id, 'type' => 'final']);
    }

    public function test_cancelled_final_invoice_reissues_from_saved_meters_and_damage_evidence(): void
    {
        $contract = $this->contract();
        $this->login();
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'damaged', 'expected_revision' => $contract->lifecycleRevision(),
        ])->assertOk();
        $contract = app(ContractService::class)->find($contract->id);
        $input = $this->input($contract, ['damages' => [
            ['description' => 'Kính cửa sổ', 'reason' => 'Nứt khi bàn giao', 'basis' => 'Báo giá K-10', 'amount' => 300_000],
        ]]);
        $photo = UploadedFile::fake()->createWithContent('damage.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $original = $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $input, files: [
            'damage_photos' => [[$photo]],
        ])->assertCreated()->json('data');
        $readingIds = DB::table('meter_readings')->where('invoice_id', $original['id'])->orderBy('id')->pluck('id')->all();
        $this->spa('POST', '/api/v1/invoices/'.$original['id'].'/cancel', [
            'expected_revision' => $original['revision'], 'reason' => 'Sai căn cứ trong bản nháp.',
        ])->assertOk()->assertJsonPath('data.status', 'cancelled');
        $cancelled = $this->spa('GET', '/api/v1/invoices/'.$original['id'])->assertOk()->json('data');

        $replacement = $this->spa('POST', '/api/v1/invoices/'.$original['id'].'/reissue', [
            'expected_revision' => $cancelled['revision'],
        ])->assertCreated()->assertJsonPath('data.type', 'final')->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.related_invoice_id', $original['id'])->assertJsonPath('data.total_amount', 9_519_500)->json('data');
        $damage = collect($replacement['items'])->firstWhere('item_type', 'damage');
        $this->assertSame('Báo giá K-10', $damage['basis']);
        $this->assertCount(1, $damage['evidence_urls']);
        $this->assertSame($readingIds, DB::table('meter_readings')->where('invoice_id', $replacement['id'])->orderBy('id')->pluck('id')->all());
        $this->assertSame(1, DB::table('attachments')->where('attachable_type', 'contract')->where('attachable_id', $contract->id)
            ->where('collection', 'damage_photo')->count());
        $this->spa('POST', '/api/v1/invoices/'.$replacement['id'].'/issue', [
            'expected_revision' => $replacement['revision'],
        ])->assertOk()->assertJsonPath('data.status', 'issued');
        $this->spa('POST', '/api/v1/invoices/'.$original['id'].'/reissue', [
            'expected_revision' => $cancelled['revision'],
        ])->assertConflict();
        $this->spa('POST', '/api/v1/invoices/'.$replacement['id'].'/issue', [
            'expected_revision' => $replacement['revision'],
        ])->assertConflict();
        $this->assertSame(2, DB::table('invoices')->where('contract_id', $contract->id)->where('type', 'final')->count());
        $this->assertSame(2, DB::table('meter_readings')->where('contract_id', $contract->id)->where('kind', 'final')->count());
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('POST', '/api/v1/invoices/'.$original['id'].'/reissue', [
                'expected_revision' => $cancelled['revision'],
            ])->assertForbidden();
            $this->spa('GET', parse_url($damage['evidence_urls'][0], PHP_URL_PATH))->assertNotFound();
        }
    }

    public function test_final_invoice_permission_csrf_validation_and_stale_revision_never_write(): void
    {
        $contract = $this->contract();
        $url = '/api/v1/contracts/'.$contract->id.'/final-invoice';
        $input = $this->input($contract);
        $this->spa('POST', $url, $input)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('POST', $url, $input)->assertForbidden();
        }
        $admin = $this->login();
        $this->spa('POST', $url, $input, sendCsrf: false)->assertStatus(419);
        $this->spa('POST', '/api/v1/contracts/999999999/final-invoice', $input)->assertNotFound();
        foreach (['status', 'unit_price', 'total_amount', 'role', 'inspection_result', 'early_termination_fee'] as $field) {
            $this->spa('POST', $url, [...$input, $field => 1])->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->spa('POST', $url, [...$input, 'electricity_reading' => 125])->assertUnprocessable()->assertJsonValidationErrors('electricity_reading');
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'no_damage', 'expected_revision' => $input['expected_revision'],
        ])->assertOk();
        $this->spa('POST', $url, $input)->assertConflict();
        $admin->status = UserStatus::Locked;
        $admin->save();
        $this->spa('POST', $url, $input)->assertForbidden();
        $this->assertDatabaseMissing('invoices', ['contract_id' => $contract->id, 'type' => 'final']);
        $this->assertDatabaseMissing('meter_readings', ['contract_id' => $contract->id, 'kind' => 'final']);
    }

    public function test_same_day_final_zero_issues_paid_without_payment_or_terminating_contract(): void
    {
        $contract = $this->contract();
        DB::table('meter_readings')->where('contract_id', $contract->id)->delete();
        $this->login();
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'no_damage', 'expected_revision' => $contract->lifecycleRevision(),
        ])->assertOk();
        $contract = app(ContractService::class)->find($contract->id);
        $input = $this->input($contract, ['actual_end_date' => '2026-08-01', 'electricity_reading' => '100.00', 'water_reading' => '10.00']);
        $roomBefore = $contract->room->fresh()->getAttributes();
        $draft = $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $input)
            ->assertCreated()->assertJsonPath('data.total_amount', 0)->assertJsonCount(0, 'data.items')->json('data');
        $this->spa('POST', '/api/v1/invoices/'.$draft['id'].'/issue', ['expected_revision' => $draft['revision']])
            ->assertOk()->assertJsonPath('data.status', 'paid')->assertJsonPath('data.paid_amount', 0);
        $this->assertSame(2, DB::table('meter_readings')->where('invoice_id', $draft['id'])->count());
        $this->assertDatabaseMissing('payments', ['invoice_id' => $draft['id']]);
        $this->assertSame($roomBefore, $contract->room->fresh()->getAttributes());
        $this->assertDatabaseHas('contracts', ['id' => $contract->id, 'status' => 'active']);
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $input)->assertConflict();
        $this->assertSame(1, DB::table('invoices')->where('contract_id', $contract->id)->count());
    }

    public function test_waiver_uses_only_signed_condition_and_saves_actor_evidence_atomically(): void
    {
        $contract = $this->contract();
        $contract->early_termination_fee_type = EarlyTerminationFeeType::Fixed;
        $contract->early_termination_fee_amount = 250000;
        $contract->early_termination_waiver_conditions = [['code' => 'approved_reason', 'description' => 'Điều kiện đã ký trong test']];
        $contract->save();
        $contract = app(ContractService::class)->find($contract->id);
        $admin = $this->login();
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'no_damage', 'expected_revision' => $contract->lifecycleRevision(),
        ])->assertOk();
        $contract = app(ContractService::class)->find($contract->id);
        $input = $this->input($contract, ['waiver_code' => 'approved_reason', 'waiver_note' => 'Căn cứ theo điều kiện test']);
        $url = '/api/v1/contracts/'.$contract->id.'/final-invoice';
        $this->spa('POST', $url, $input)->assertUnprocessable()->assertJsonValidationErrors('waiver_evidence');
        $photo = fn () => UploadedFile::fake()->createWithContent('basis.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $this->spa('POST', $url, [...$input, 'waiver_code' => 'not_signed'], files: ['waiver_evidence' => [$photo()]])
            ->assertUnprocessable();
        $this->assertSame([], Storage::disk('private')->allFiles());
        $this->assertNull($contract->fresh()->early_termination_waiver_code);
        $draft = $this->spa('POST', $url, $input, files: ['waiver_evidence' => [$photo()]])
            ->assertCreated()->assertJsonPath('data.total_amount', 9_219_500)->json('data');
        $this->assertSame(0, collect($draft['items'])->where('item_type', 'termination_fee')->count());
        $this->assertDatabaseHas('contracts', ['id' => $contract->id, 'early_termination_waiver_code' => 'approved_reason',
            'early_termination_waived_by' => $admin->id]);
        $this->assertSame(1, DB::table('attachments')->where('attachable_id', $contract->id)->where('collection', 'waiver_evidence')->count());
        $this->spa('POST', '/api/v1/invoices/'.$draft['id'].'/issue', ['expected_revision' => $draft['revision']])->assertOk();
    }

    public function test_failed_draft_rolls_back_final_meters_contract_evidence_and_invoice(): void
    {
        $contract = $this->contract();
        $this->login();
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'damaged', 'expected_revision' => $contract->lifecycleRevision(),
        ])->assertOk();
        $contract = app(ContractService::class)->find($contract->id);
        $before = $contract->getAttributes();
        $input = $this->input($contract, ['damages' => [
            ['description' => 'Hạng mục test', 'reason' => 'Lý do test', 'basis' => 'Báo giá test', 'amount' => Money::MAX_VND],
        ]]);
        $photo = UploadedFile::fake()->createWithContent('damage.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice', $input, files: ['damage_photos' => [[$photo]]])
            ->assertUnprocessable()->assertJsonValidationErrors('actual_end_date');
        $this->assertSame($before, $contract->fresh()->getAttributes());
        $this->assertDatabaseMissing('meter_readings', ['contract_id' => $contract->id, 'kind' => 'final']);
        $this->assertDatabaseMissing('invoices', ['contract_id' => $contract->id, 'type' => 'final']);
        $this->assertSame(0, DB::table('attachments')->where('attachable_id', $contract->id)->count());
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_issued_month_credit_offsets_final_and_other_charges_without_double_billing(): void
    {
        $contract = $this->contract();
        $this->login();
        foreach (['2026-08-01', '2026-09-01', '2026-10-01'] as $period) {
            $month = CarbonImmutable::parse($period);
            $invoiceId = DB::table('invoices')->insertGetId(['contract_id' => $contract->id, 'type' => 'monthly',
                'period' => $period, 'status' => 'issued', 'total_amount' => 3100000, 'paid_amount' => 0]);
            DB::table('invoice_items')->insert(['invoice_id' => $invoiceId, 'item_type' => 'rent', 'description' => 'Tiền phòng test',
                'quantity' => '1.00', 'unit_price' => 3100000, 'amount' => 3100000,
                'meta' => json_encode(['source' => 'generated', 'days_in_month' => $month->daysInMonth,
                    'start_date' => $period, 'end_date_exclusive' => $month->addMonth()->format('Y-m-d')])]);
            DB::table('meter_readings')->where('contract_id', $contract->id)
                ->where('period', $month->subMonth()->format('Y-m-d'))->update(['invoice_id' => $invoiceId]);
        }
        $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/inspection', [
            'inspection_result' => 'no_damage', 'expected_revision' => $contract->lifecycleRevision(),
        ])->assertOk();
        $contract = app(ContractService::class)->find($contract->id);
        $draft = $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/final-invoice',
            $this->input($contract, ['actual_end_date' => '2026-10-15']))
            ->assertCreated()->assertJsonPath('data.total_amount', 0)->json('data');
        $this->assertStringContainsString('1.667.500 VND', $contract->fresh()->closure_note);
        $this->assertStringContainsString('1.667.500 VND', $draft['contract_closure_note']);
        $this->assertSame(0, collect($draft['items'])->where('item_type', 'rent')->count());
        $updated = $this->spa('POST', '/api/v1/invoices/'.$draft['id'].'/other-items', [
            'description' => 'Khoản khác hợp lệ', 'basis' => 'Căn cứ đã duyệt trong test', 'amount' => 100000,
            'expected_revision' => $draft['revision'],
        ])->assertOk()->assertJsonPath('data.total_amount', 0)->json('data');
        $this->assertSame(-132500, collect($updated['items'])->where('item_type', 'discount')->sum('amount'));
        $this->assertStringContainsString('1.567.500 VND', $contract->fresh()->closure_note);
        $this->assertStringContainsString('1.567.500 VND', $updated['contract_closure_note']);
        $this->assertStringNotContainsString('1.667.500 VND', $contract->fresh()->closure_note);
        $this->spa('POST', '/api/v1/invoices/'.$draft['id'].'/issue', ['expected_revision' => $updated['revision']])
            ->assertOk()->assertJsonPath('data.status', 'paid')->assertJsonPath('data.paid_amount', 0);
        $this->assertDatabaseMissing('payments', ['invoice_id' => $draft['id']]);
    }
}
