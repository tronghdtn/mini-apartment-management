<?php

namespace Tests\Feature\Utilities;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class MeterReadingApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private const U1 = 'migrations/pending/2026_10_27_000002_scope_utility_prices_to_buildings.php';

    private const U3 = 'migrations/pending/2026_10_28_000001_scope_final_meter_readings_to_contracts.php';

    private bool $ownsSchema = false;

    private bool $fixtureTransaction = false;

    private Service $power;

    private Service $water;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasColumn('utility_prices', 'building_id'));
        $this->assertFalse(Schema::hasColumn('meter_readings', 'final_contract_id'));
        $this->assertSame(0, DB::table('utility_prices')->count());
        (require database_path(self::U1))->up();
        (require database_path(self::U3))->up();
        $this->ownsSchema = true;
        DB::beginTransaction();
        $this->fixtureTransaction = true;
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
            if ($this->ownsSchema) {
                (require database_path(self::U3))->down();
                (require database_path(self::U1))->down();
            }
        } finally {
            parent::tearDown();
        }
    }

    private function login(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'MTR Private Test!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'MTR Private Test!42'])->assertOk();

        return $user;
    }

    private function contract(array $overrides = []): Contract
    {
        $contract = Contract::factory()->active()->create(['start_date' => '2026-10-01', ...$overrides]);
        foreach ([$this->power, $this->water] as $service) {
            $contract->contractServices()->create(['service_id' => $service->id, 'quantity' => '1.00', 'unit_price' => null, 'start_date' => $contract->start_date->format('Y-m-d')]);
            DB::table('utility_prices')->insertOrIgnore(['building_id' => $contract->room->building_id, 'service_id' => $service->id,
                'unit_price' => $service->id === $this->power->id ? 3500 : 15000, 'effective_from' => '2026-10-01']);
        }

        return $contract;
    }

    private function entry(Contract $contract, array $overrides = []): array
    {
        return ['room_id' => $contract->room_id, 'service_id' => $this->power->id, 'period' => '2026-10-01',
            'reading_date' => '2026-11-01', 'current_reading' => '112.35', ...$overrides];
    }

    private function save(array $entries, bool $csrf = true): TestResponse
    {
        return $this->spa('POST', '/api/v1/meter-readings', ['readings' => $entries], sendCsrf: $csrf);
    }

    public function test_guest_roles_locked_admin_and_csrf_cannot_record_or_read(): void
    {
        $contract = $this->contract();
        $contextUrl = '/api/v1/rooms/'.$contract->room_id.'/meter-reading-context?service_id='.$this->power->id.'&period=2026-10-01&reading_date=2026-11-01';
        $this->spa('GET', '/api/v1/meter-readings')->assertUnauthorized();
        $this->spa('GET', $contextUrl)->assertUnauthorized();
        $this->save([])->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('GET', '/api/v1/meter-readings')->assertForbidden();
            $this->spa('GET', $contextUrl)->assertForbidden();
            $this->save([])->assertForbidden();
            $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
        }
        $admin = $this->login();
        $this->save([], false)->assertStatus(419);
        $admin->status = 'locked';
        $admin->save();
        $this->spa('GET', '/api/v1/meter-readings')->assertForbidden();
        $this->save([])->assertUnauthorized();
        $this->assertDatabaseCount('meter_readings', 0);
    }

    public function test_real_batch_uses_initial_baseline_price_and_half_up_then_filters_and_persists(): void
    {
        $this->login();
        $contract = $this->contract();
        $this->spa('GET', '/api/v1/rooms/'.$contract->room_id.'/meter-reading-context?service_id='.$this->power->id.'&period=2026-10-01&reading_date=2026-11-01')
            ->assertOk()->assertJsonPath('data.previous_reading', '100.00')->assertJsonPath('data.unit_price', 3500);
        $response = $this->save([$this->entry($contract), $this->entry($contract, ['service_id' => $this->water->id, 'current_reading' => '10.01'])])->assertCreated();
        $response->assertJsonPath('data.0.contract_id', $contract->id)->assertJsonPath('data.0.consumption', '12.35')->assertJsonPath('data.0.amount', 43225)
            ->assertJsonPath('data.1.amount', 150)->assertJsonMissingPath('data.0.periodic_contract_id');
        $this->spa('GET', '/api/v1/meter-readings?building_id='.$contract->room->building_id.'&room_id='.$contract->room_id.'&period=2026-10-01&service_id='.$this->power->id)
            ->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $response->json('data.0.id'));
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('payments', 0);
        $this->spa('PUT', '/api/v1/meter-readings/'.$response->json('data.0.id'), [])->assertNotFound();
    }

    public static function invalidEntries(): array
    {
        return ['unknown room' => [['room_id' => 2147483647]], 'unknown service' => [['service_id' => 2147483647]],
            'negative' => [['current_reading' => '-1']], 'float' => [['current_reading' => 112.35]],
            'precision' => [['current_reading' => '112.351']], 'over max' => [['current_reading' => '100000000.00']],
            'boolean room' => [['room_id' => true]], 'period day' => [['period' => '2026-10-02']],
            'bad date' => [['reading_date' => '2026-02-30']], 'fake owner' => [['contract_id' => 1]],
            'fake money' => [['amount' => 1]], 'public final' => [['kind' => 'final']],
            'fake previous' => [['previous_reading' => '0.00']], 'date before period' => [['reading_date' => '2026-09-30']]];
    }

    #[DataProvider('invalidEntries')]
    public function test_invalid_input_never_creates_readings(array $input): void
    {
        $this->login();
        $this->save([$this->entry($this->contract(), $input)])->assertUnprocessable();
        $this->assertDatabaseCount('meter_readings', 0);
    }

    public function test_failure_in_second_row_rolls_back_first_and_duplicate_batch_is_rejected(): void
    {
        $this->login();
        $contract = $this->contract();
        $first = $this->entry($contract);
        $this->save([$first, $this->entry($contract, ['service_id' => $this->water->id, 'current_reading' => '9.99'])])->assertUnprocessable()->assertJsonValidationErrors('readings.1.current_reading');
        $this->assertDatabaseCount('meter_readings', 0);
        $this->save([$first, $first])->assertUnprocessable();
        $this->assertDatabaseCount('meter_readings', 0);
    }

    public function test_does_not_skip_periods_or_accept_lower_readings_or_backdated_dates(): void
    {
        $this->login();
        $contract = $this->contract();
        $this->save([$this->entry($contract, ['period' => '2026-11-01', 'reading_date' => '2026-12-01'])])->assertUnprocessable();
        $this->save([$this->entry($contract, ['current_reading' => '99.99'])])->assertUnprocessable();
        $this->save([$this->entry($contract)])->assertCreated();
        $this->save([$this->entry($contract, ['reading_date' => '2026-11-02'])])->assertConflict();
        $this->save([$this->entry($contract, ['period' => '2026-11-01', 'current_reading' => '120'])])->assertUnprocessable();
        $this->save([$this->entry($contract, ['period' => '2026-11-01', 'reading_date' => '2026-12-01', 'current_reading' => '120'])])->assertCreated()->assertJsonPath('data.0.previous_reading', '112.35');
    }

    public function test_each_building_uses_its_own_price_and_missing_price_has_no_fallback(): void
    {
        $this->login();
        $a = $this->contract();
        $b = $this->contract();
        DB::table('utility_prices')->where('building_id', $b->room->building_id)->where('service_id', $this->power->id)->update(['unit_price' => 4200]);
        $this->save([$this->entry($a), $this->entry($b)])->assertCreated()->assertJsonPath('data.0.amount', 43225)->assertJsonPath('data.1.amount', 51870);
        $c = $this->contract();
        DB::table('utility_prices')->where('building_id', $c->room->building_id)->delete();
        $this->save([$this->entry($c)])->assertUnprocessable();
        $this->assertDatabaseCount('meter_readings', 2);
    }

    public function test_line_amount_rounds_half_up_without_float(): void
    {
        $this->login();
        $contract = $this->contract();
        DB::table('utility_prices')->where('building_id', $contract->room->building_id)->where('service_id', $this->power->id)->update(['unit_price' => 3501]);
        $this->save([$this->entry($contract, ['current_reading' => '100.50'])])->assertCreated()
            ->assertJsonPath('data.0.consumption', '0.50')->assertJsonPath('data.0.unit_price', 3501)->assertJsonPath('data.0.amount', 1751);
    }

    public function test_old_periodic_and_final_do_not_block_new_tenant_or_bill_activation_gap(): void
    {
        $this->login();
        $old = $this->contract(['start_date' => '2026-10-01', 'activated_at' => '2026-09-30 00:00:00']);
        $this->save([$this->entry($old, ['reading_date' => '2026-10-15', 'current_reading' => '110'])])->assertCreated();
        $old->status = 'terminated';
        $old->actual_end_date = '2026-10-20';
        $old->closed_at = '2026-10-20 00:00:00';
        $old->save();
        MeterReading::factory()->final()->create(['room_id' => $old->room_id, 'contract_id' => $old->id, 'service_id' => $this->power->id,
            'reading_date' => '2026-10-20', 'previous_reading' => '110', 'current_reading' => '115', 'consumption' => '5', 'created_at' => '2026-10-20 00:00:00']);
        $new = $this->contract(['room_id' => $old->room_id, 'start_date' => '2026-10-20', 'activated_at' => '2026-10-20 01:00:00',
            'initial_electricity_reading' => '117', 'meter_gap_reason' => 'Test gap confirmed', 'meter_gap_confirmed_by' => User::where('role', 'admin')->value('id')]);
        $this->save([$this->entry($new, ['current_reading' => '120'])])->assertCreated()->assertJsonPath('data.0.contract_id', $new->id)
            ->assertJsonPath('data.0.previous_reading', '117.00')->assertJsonPath('data.0.consumption', '3.00')->assertJsonPath('data.0.amount', 10500);
        $this->assertDatabaseCount('meter_readings', 3);
    }

    public function test_missing_boundary_vacancy_initial_and_handover_day_are_not_guessed(): void
    {
        $this->login();
        $empty = Room::factory()->create();
        $fake = $this->contract();
        $this->save([$this->entry($fake, ['room_id' => $empty->id])])->assertUnprocessable();
        $fake->initial_electricity_reading = null;
        $fake->save();
        $this->save([$this->entry($fake)])->assertUnprocessable();
        $fake->initial_electricity_reading = '100';
        $fake->status = 'terminated';
        $fake->actual_end_date = '2026-10-20';
        $fake->save();
        $this->save([$this->entry($fake, ['reading_date' => '2026-10-20'])])->assertUnprocessable();
        MeterReading::factory()->create(['room_id' => $fake->room_id, 'service_id' => $this->power->id, 'contract_id' => $fake->id, 'reading_date' => '2026-10-15']);
        $this->save([$this->entry($fake)])->assertUnprocessable();
    }

    public static function invalidHandoverHistory(): array
    {
        return ['missing final' => ['missing_final'], 'unconfirmed gap' => ['gap'], 'initial below previous final' => ['lower']];
    }

    #[DataProvider('invalidHandoverHistory')]
    public function test_legacy_activation_cannot_bypass_required_final_or_gap_confirmation(string $case): void
    {
        $this->login();
        $old = $this->contract(['activated_at' => '2026-09-30 00:00:00']);
        $old->status = 'terminated';
        $old->actual_end_date = '2026-10-20';
        $old->closed_at = '2026-10-20 00:00:00';
        $old->save();
        MeterReading::factory()->create(['room_id' => $old->room_id, 'contract_id' => $old->id, 'service_id' => $this->power->id,
            'kind' => $case === 'missing_final' ? 'periodic' : 'final', 'reading_date' => $case === 'missing_final' ? '2026-10-15' : '2026-10-20',
            'current_reading' => '115', 'created_at' => '2026-10-20 00:00:00']);
        $new = $this->contract(['room_id' => $old->room_id, 'start_date' => '2026-10-20', 'activated_at' => '2026-10-20 01:00:00',
            'initial_electricity_reading' => $case === 'lower' ? '110' : '117']);
        $this->save([$this->entry($new, ['current_reading' => '120'])])->assertUnprocessable();
        $this->assertDatabaseCount('meter_readings', 1);
    }

    public function test_issued_invoice_and_money_overflow_are_rejected_without_mutating_snapshots(): void
    {
        $this->login();
        $contract = $this->contract();
        $invoice = Invoice::factory()->issued()->create(['contract_id' => $contract->id, 'period' => '2026-11-01', 'total_amount' => 123456]);
        $before = (array) DB::table('invoices')->find($invoice->id);
        $this->save([$this->entry($contract)])->assertConflict();
        $this->assertSame($before, (array) DB::table('invoices')->find($invoice->id));
        $other = $this->contract();
        DB::table('utility_prices')->where('building_id', $other->room->building_id)->update(['unit_price' => 9007199254740991]);
        $this->save([$this->entry($other)])->assertUnprocessable();
        $this->assertDatabaseCount('meter_readings', 0);
    }

    public function test_vacancy_consumption_stays_separate_and_cannot_skip_meter_periods(): void
    {
        $this->login();
        $old = $this->contract();
        $old->status = 'terminated';
        $old->actual_end_date = '2026-10-20';
        $old->save();
        MeterReading::factory()->final()->create(['room_id' => $old->room_id, 'contract_id' => $old->id, 'service_id' => $this->power->id, 'reading_date' => '2026-10-20']);
        $this->save([$this->entry($old, ['period' => '2027-01-01', 'reading_date' => '2027-02-01', 'current_reading' => '120'])])->assertUnprocessable();
        $this->save([$this->entry($old, ['reading_date' => '2026-10-31', 'current_reading' => '120'])])->assertCreated()
            ->assertJsonPath('data.0.contract_id', null)->assertJsonPath('data.0.previous_reading', '112.35')->assertJsonPath('data.0.amount', 26775);
    }

    public function test_late_data_entry_preserves_actual_measurement_date_and_zero_consumption(): void
    {
        $contract = $this->contract();
        $this->travelTo(CarbonImmutable::parse('2027-04-01'));
        try {
            $this->cookieJar = [];
            $this->initializeSpaClient();
            $this->login();
            $this->save([$this->entry($contract, ['reading_date' => '2026-10-31', 'current_reading' => '100.00'])])->assertCreated()
                ->assertJsonPath('data.0.reading_date', '2026-10-31')->assertJsonPath('data.0.consumption', '0.00')->assertJsonPath('data.0.amount', 0);
        } finally {
            $this->travelBack();
        }
    }
}
