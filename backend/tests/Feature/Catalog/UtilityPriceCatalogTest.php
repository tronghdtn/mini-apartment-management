<?php

namespace Tests\Feature\Catalog;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Models\UtilityPrice;
use Illuminate\Database\Schema\Builder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class UtilityPriceCatalogTest extends TestCase
{
    use InteractsWithSpaCookies;

    private Building $building;

    private ?Builder $realSchema = null;

    private bool $ownsScope = false;

    private function scopeMigration(): object
    {
        return require database_path('migrations/pending/2026_10_27_000002_scope_utility_prices_to_buildings.php');
    }

    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate', ['--force' => true]);
        $this->realSchema = DB::connection()->getSchemaBuilder();
        $this->assertFalse($this->realSchema->hasColumn('utility_prices', 'building_id'), 'Scoped API tests must own their DDL and never borrow browser schema.');
        $this->assertDatabaseCount('utility_prices', 0);
        $this->scopeMigration()->up();
        $this->ownsScope = true;
        DB::beginTransaction(); // MySQL DDL must finish BEFORE starting fixture transactions.
        $this->initializeSpaClient();
        $this->building = Building::factory()->create();
    }

    protected function tearDown(): void
    {
        try {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            if ($this->ownsScope) {
                Schema::swap($this->realSchema); // Restore the real builder after readiness-mock cases.
                $this->assertDatabaseCount('utility_prices', 0);
                $this->scopeMigration()->down();
                $this->assertFalse($this->realSchema->hasColumn('utility_prices', 'building_id'));
            }
        } finally {
            parent::tearDown();
        }
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Utility Test!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => 'Utility Test!42'])->assertOk();

        return $user;
    }

    private function metered(): Service
    {
        return Service::factory()->metered('ELECTRICITY', 'kWh')->create();
    }

    private function input(Service $service): array
    {
        return ['building_id' => $this->building->id, 'service_id' => $service->id, 'unit_price' => 3500, 'effective_from' => '2026-12-01'];
    }

    /** @return array<string,array{string,string}> */
    public static function roleMethods(): array
    {
        $cases = [];
        foreach (['anonymous', 'user', 'resident', 'technician', 'guard', 'locked'] as $role) {
            foreach (['GET', 'POST'] as $method) {
                $cases[$role.' '.$method] = [$role, $method];
            }
        }

        return $cases;
    }

    #[DataProvider('roleMethods')]
    public function test_utility_endpoints_check_session_role_and_account_status(string $role, string $method): void
    {
        $service = $this->metered();
        if ($role !== 'anonymous') {
            $user = $this->signIn($role === 'locked' ? UserRole::Admin : UserRole::from($role));
            if ($role === 'locked') {
                $user->status = UserStatus::Locked;
                $user->save();
            }
        }
        $this->spa($method, '/api/v1/utility-prices', $this->input($service))->assertStatus($role === 'anonymous' ? 401 : 403);
    }

    public function test_creates_real_price_resource_and_preserves_vietnamese_calendar_date(): void
    {
        $this->signIn();
        $service = $this->metered();
        $input = $this->input($service);
        $response = $this->spa('POST', '/api/v1/utility-prices', $input)->assertCreated();
        $id = $response->json('data.id');
        $response->assertExactJson(['data' => ['id' => $id] + $input + ['building' => ['id' => $this->building->id, 'name' => $this->building->name], 'service' => ['id' => $service->id, 'code' => $service->code, 'name' => $service->name, 'unit' => 'kWh']]]);
        $this->assertDatabaseHas('utility_prices', $input + ['id' => $id]);
        $this->assertIsInt($response->json('data.unit_price'));
        $this->spa('GET', '/api/v1/utility-prices')->assertOk()->assertJsonPath('data.0.effective_from', '2026-12-01');
    }

    public function test_lists_empty_history_paginated_by_effective_date_and_filters_service(): void
    {
        $this->signIn();
        $this->spa('GET', '/api/v1/utility-prices')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        $electricity = $this->metered();
        $water = Service::factory()->metered('WATER', 'm3')->create();
        for ($month = 1; $month <= 21; $month++) {
            $date = now()->setDate(2024, 1, 1)->startOfDay()->addMonths($month)->toDateString();
            UtilityPrice::create(['building_id' => $this->building->id, 'service_id' => $electricity->id, 'unit_price' => 3000 + $month, 'effective_from' => $date]);
        }
        $latest = UtilityPrice::create(['building_id' => $this->building->id, 'service_id' => $water->id, 'unit_price' => 15000, 'effective_from' => '2030-01-01']);
        $first = $this->spa('GET', '/api/v1/utility-prices')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 22)->assertJsonPath('data.0.id', $latest->id)->assertJsonStructure(['data', 'links', 'meta']);
        $dates = array_column($first->json('data'), 'effective_from');
        $sorted = $dates;
        rsort($sorted);
        $this->assertSame($sorted, $dates);
        $this->spa('GET', '/api/v1/utility-prices?page=2')->assertOk()->assertJsonCount(2, 'data');
        $this->spa('GET', '/api/v1/utility-prices?service_id='.$water->id)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $latest->id);
    }

    /** @return array<string,array{array,string}> */
    public static function invalidInputs(): array
    {
        return [
            'missing building' => [['building_id' => null], 'building_id'], 'unknown building' => [['building_id' => 9999999], 'building_id'],
            'boolean building' => [['building_id' => true], 'building_id'], 'fraction building' => [['building_id' => 1.5], 'building_id'],
            'missing service' => [['service_id' => null], 'service_id'], 'unknown service' => [['service_id' => 9999999], 'service_id'],
            'zero price' => [['unit_price' => 0], 'unit_price'], 'negative price' => [['unit_price' => -1], 'unit_price'],
            'fraction price' => [['unit_price' => 3500.25], 'unit_price'], 'unsafe JSON price' => [['unit_price' => 9007199254740992], 'unit_price'],
            'boolean true price' => [['unit_price' => true], 'unit_price'], 'boolean false price' => [['unit_price' => false], 'unit_price'],
            'not month start' => [['effective_from' => '2026-12-02'], 'effective_from'], 'invalid month' => [['effective_from' => '2026-13-01'], 'effective_from'],
            'invalid calendar day' => [['effective_from' => '2026-02-30'], 'effective_from'], 'timestamp instead of DATE' => [['effective_from' => '2026-12-01T00:00:00Z'], 'effective_from'],
            'zero year' => [['effective_from' => '0000-01-01'], 'effective_from'], 'year one' => [['effective_from' => '0001-01-01'], 'effective_from'],
            'before SQL date range' => [['effective_from' => '0999-01-01'], 'effective_from'],
            'id override' => [['id' => 23], 'id'], 'null id' => [['id' => null], 'id'],
        ];
    }

    #[DataProvider('invalidInputs')]
    public function test_invalid_price_input_has_field_errors_and_no_partial_insert(array $extra, string $field): void
    {
        $this->signIn();
        $service = $this->metered();
        $this->spa('POST', '/api/v1/utility-prices', array_replace($this->input($service), $extra))->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('utility_prices', 0);
    }

    public function test_ordinary_services_cannot_have_metered_prices(): void
    {
        $this->signIn();
        $service = Service::factory()->create();
        $this->spa('POST', '/api/v1/utility-prices', $this->input($service))->assertUnprocessable()->assertJsonValidationErrors('service_id');
        $this->assertDatabaseCount('utility_prices', 0);
    }

    public function test_duplicate_service_effective_date_is_rejected_without_changing_history(): void
    {
        $this->signIn();
        $service = $this->metered();
        UtilityPrice::create($this->input($service));
        $this->spa('POST', '/api/v1/utility-prices', array_replace($this->input($service), ['unit_price' => 5000]))->assertUnprocessable()->assertJsonValidationErrors('effective_from');
        $this->assertDatabaseCount('utility_prices', 1);
        $this->assertSame(3500, UtilityPrice::sole()->unit_price);
    }

    /** @return array<string,array{string}> */
    public static function protectedPeriods(): array
    {
        return ['earlier' => ['2026-09-01'], 'same unbilled period' => ['2026-10-01']];
    }

    #[DataProvider('protectedPeriods')]
    public function test_even_unbilled_readings_block_prices_at_or_before_their_consumption_period(string $date): void
    {
        $this->signIn();
        $service = $this->metered();
        $reading = MeterReading::factory()->create(['room_id' => Room::factory()->create(['building_id' => $this->building->id])->id, 'service_id' => $service->id, 'period' => '2026-10-01']);
        $before = (array) DB::table('meter_readings')->find($reading->id);
        $this->spa('POST', '/api/v1/utility-prices', array_replace($this->input($service), ['effective_from' => $date]))->assertUnprocessable()->assertJsonValidationErrors('effective_from');
        $this->assertDatabaseCount('utility_prices', 0);
        $this->assertSame($before, (array) DB::table('meter_readings')->find($reading->id));
        $this->spa('POST', '/api/v1/utility-prices', array_replace($this->input($service), ['effective_from' => '2026-11-01']))->assertCreated();
    }

    public function test_another_services_readings_do_not_block_new_price(): void
    {
        $this->signIn();
        $electricity = $this->metered();
        $water = Service::factory()->metered('WATER', 'm3')->create();
        MeterReading::factory()->create(['service_id' => $water->id, 'period' => '2028-01-01', 'reading_date' => '2028-02-01']);
        $this->spa('POST', '/api/v1/utility-prices', $this->input($electricity))->assertCreated();
    }

    /** @return array<string,array{string}> */
    public static function supportedBoundaryDates(): array
    {
        return ['minimum SQL DATE' => ['1000-01-01'], 'maximum first-of-month SQL DATE' => ['9999-12-01']];
    }

    #[DataProvider('supportedBoundaryDates')]
    public function test_supported_sql_calendar_boundaries_round_trip_without_conversion(string $date): void
    {
        $this->signIn();
        $service = $this->metered();
        $this->spa('POST', '/api/v1/utility-prices', array_replace($this->input($service), ['effective_from' => $date]))
            ->assertCreated()->assertJsonPath('data.effective_from', $date);
        $this->assertDatabaseHas('utility_prices', ['service_id' => $service->id, 'effective_from' => $date]);
    }

    /** @return array<string,array{string,string}> */
    public static function unavailableSchema(): array
    {
        return ['read missing history' => ['GET', 'utility_prices'], 'write missing history' => ['POST', 'utility_prices'], 'write missing reading guard' => ['POST', 'meter_readings']];
    }

    #[DataProvider('unavailableSchema')]
    public function test_missing_schema_returns_explicit_503_without_sql_details(string $method, string $missing): void
    {
        $this->signIn();
        $input = $this->input($this->metered());
        Schema::shouldReceive('hasTable')->with('utility_prices')->andReturn($missing !== 'utility_prices');
        Schema::shouldReceive('hasColumn')->with('utility_prices', 'building_id')->andReturn(true);
        Schema::shouldReceive('hasTable')->with('meter_readings')->andReturn($missing !== 'meter_readings');
        $response = $this->spa($method, '/api/v1/utility-prices', $input)->assertStatus(503)->assertJsonStructure(['message']);
        $this->assertArrayNotHasKey('data', $response->json());
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
    }

    public function test_real_unique_race_is_safe_409(): void
    {
        $this->signIn();
        $service = $this->metered();
        Event::listen('eloquent.creating: '.UtilityPrice::class, function (UtilityPrice $price): void {
            DB::table('utility_prices')->insert(['building_id' => $price->building_id, 'service_id' => $price->service_id, 'effective_from' => $price->effective_from->toDateString(), 'unit_price' => 99, 'created_at' => now(), 'updated_at' => now()]);
        });
        $response = $this->spa('POST', '/api/v1/utility-prices', $this->input($service))->assertConflict()->assertJsonStructure(['message']);
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertDatabaseCount('utility_prices', 0);
    }

    public function test_update_and_delete_are_not_exposed(): void
    {
        $this->signIn();
        $price = UtilityPrice::create($this->input($this->metered()));
        foreach (['PATCH', 'PUT', 'DELETE'] as $method) {
            $response = $this->spa($method, '/api/v1/utility-prices/'.$price->id, ['unit_price' => 999]);
            $this->assertContains($response->status(), [404, 405]);
        }
        $this->assertSame(3500, $price->fresh()->unit_price);
    }

    public function test_same_service_and_month_can_have_different_building_prices_and_filters_are_combined(): void
    {
        $this->signIn();
        $service = $this->metered();
        $other = Building::factory()->create();
        $input = $this->input($service);
        $this->spa('POST', '/api/v1/utility-prices', $input)->assertCreated();
        $this->spa('POST', '/api/v1/utility-prices', [...$input, 'building_id' => $other->id, 'unit_price' => 4200])->assertCreated();
        $this->spa('GET', '/api/v1/utility-prices?building_id='.$other->id.'&service_id='.$service->id)
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.unit_price', 4200)->assertJsonPath('data.0.building.id', $other->id);
        $new = Building::factory()->create();
        $this->spa('GET', '/api/v1/utility-prices?building_id='.$new->id)->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/utility-prices?building_id=9999999')->assertUnprocessable()->assertJsonValidationErrors('building_id');
    }

    public function test_readings_in_another_building_do_not_block_this_buildings_price_and_issued_invoice_is_unchanged(): void
    {
        $this->signIn();
        $service = $this->metered();
        $other = Building::factory()->create();
        $room = Room::factory()->create(['building_id' => $other->id]);
        $contract = Contract::factory()->active()->create(['room_id' => $room->id]);
        $invoice = Invoice::factory()->issued()->create(['contract_id' => $contract->id, 'total_amount' => 500000]);
        $item = $invoice->items()->create(['item_type' => 'electricity', 'description' => 'Snapshot điện đã phát hành', 'quantity' => '100.00', 'unit_price' => 5000, 'amount' => 500000, 'meta' => ['basis' => 'issued snapshot']]);
        $reading = MeterReading::factory()->create(['room_id' => $room->id, 'service_id' => $service->id, 'contract_id' => $contract->id, 'invoice_id' => $invoice->id, 'period' => '2027-01-01']);
        $before = [$invoice->fresh()->getRawOriginal(), $item->fresh()->getRawOriginal(), $reading->fresh()->getRawOriginal()];
        $this->spa('POST', '/api/v1/utility-prices', $this->input($service))->assertCreated();
        $this->assertSame($before, [$invoice->fresh()->getRawOriginal(), $item->fresh()->getRawOriginal(), $reading->fresh()->getRawOriginal()]);
        $this->spa('POST', '/api/v1/utility-prices', [...$this->input($service), 'building_id' => $other->id])->assertUnprocessable()->assertJsonValidationErrors('effective_from');
    }

    public function test_legacy_global_schema_is_explicitly_unavailable_instead_of_returning_global_prices(): void
    {
        $this->signIn();
        Schema::shouldReceive('hasTable')->with('utility_prices')->andReturn(true);
        Schema::shouldReceive('hasColumn')->with('utility_prices', 'building_id')->andReturn(false);
        $this->spa('GET', '/api/v1/utility-prices')->assertStatus(503);
        $this->spa('POST', '/api/v1/utility-prices', $this->input($this->metered()))->assertStatus(503);
    }
}
