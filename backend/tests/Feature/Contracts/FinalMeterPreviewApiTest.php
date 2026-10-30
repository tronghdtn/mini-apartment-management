<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractService;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
}
