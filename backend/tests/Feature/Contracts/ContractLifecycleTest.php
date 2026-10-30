<?php

namespace Tests\Feature\Contracts;

use App\Enums\ContractStatus;
use App\Enums\DepositStatus;
use App\Enums\RoomStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Contract;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ContractLifecycleTest extends TestCase
{
    use InteractsWithSpaCookies { spa as private baseSpa; }
    use RefreshDatabase;

    protected function spa(string $method, string $uri, array $data = [], array $server = [], bool $sendCsrf = true): TestResponse
    {
        if (preg_match('#/contracts/(\d+)/(activate|deposit)$#', $uri, $matches) && ! array_key_exists('expected_revision', $data)) {
            $model = Contract::with(['contractServices' => fn ($query) => $query->orderBy('id')])->findOrFail($matches[1]);
            $data['expected_revision'] = $model->lifecycleRevision();
        }

        return $this->baseSpa($method, $uri, $data, $server, $sendCsrf);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
        Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        Service::factory()->metered('WATER', 'm3')->create();
    }

    private function admin(): User
    {
        $user = User::factory()->role(UserRole::Admin)->create(['password' => 'Lifecycle Test Private!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Lifecycle Test Private!42'])->assertOk();

        return $user;
    }

    private function draft(int $deposit = 0): Contract
    {
        return Contract::factory()->create(['deposit_amount' => $deposit, 'early_termination_fee_type' => 'none']);
    }

    private function readings(): array
    {
        return ['initial_electricity_reading' => '100.00', 'initial_water_reading' => '10.25', 'meter_gap_reason' => null, 'meter_gap_confirmed' => false];
    }

    public function test_zero_deposit_activation_changes_all_related_state_once_without_financial_rows(): void
    {
        $this->admin();
        $draft = $this->draft();
        $response = $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertOk();
        $response->assertJsonPath('data.status', 'active')->assertJsonPath('data.deposit_status', 'unpaid')
            ->assertJsonPath('data.initial_water_reading', '10.25')->assertJsonPath('data.tenant.role', 'resident');
        $this->assertSame(RoomStatus::Occupied, $draft->room->fresh()->status);
        $this->assertMatchesRegularExpression('/^HD-\d{4}-\d{4,}$/', $response->json('data.contract_number'));
        $this->assertDatabaseCount('contract_services', 2);
        foreach ($draft->contractServices as $line) {
            $this->assertNull($line->unit_price);
            $this->assertSame('1.00', $line->quantity);
            $this->assertNull($line->end_date);
        }
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('meter_readings', 0);
        $before = $draft->fresh()->getRawOriginal();
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertConflict();
        $this->assertSame($before, $draft->fresh()->getRawOriginal());
        $this->assertDatabaseCount('contract_services', 2);
    }

    public function test_receipt_is_required_for_positive_deposit_and_preserves_original_time_on_retry(): void
    {
        $this->admin();
        $draft = $this->draft(2500000);
        $url = "/api/v1/contracts/{$draft->id}";
        $this->spa('POST', "$url/activate", $this->readings())->assertConflict();
        $this->spa('POST', "$url/deposit", ['confirmed' => true, 'expected_amount' => 100])->assertConflict();
        $this->spa('POST', "$url/deposit", ['confirmed' => true, 'expected_amount' => 2500000])->assertOk()->assertJsonPath('data.deposit_status', 'held');
        $before = $draft->fresh()->getRawOriginal();
        $this->travel(2)->hours();
        $this->spa('POST', "$url/deposit", ['confirmed' => true, 'expected_amount' => 2500000])->assertOk();
        $this->assertSame($before, $draft->fresh()->getRawOriginal());
        $this->spa('POST', "$url/activate", $this->readings())->assertOk();
        $this->assertSame(DepositStatus::Held, $draft->fresh()->deposit_status);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('invoices', 0);
    }

    public static function actions(): array
    {
        $cases = [];
        foreach (['anonymous', 'user', 'resident', 'technician', 'guard'] as $role) {
            foreach (['deposit', 'activate', 'terms', 'activation-context'] as $action) {
                $cases["$role $action"] = [$role, $action];
            }
        }

        return $cases;
    }

    #[DataProvider('actions')]
    public function test_actions_deny_non_admin_without_mutation(string $role, string $action): void
    {
        $draft = $this->draft(1000);
        if ($role !== 'anonymous') {
            $actor = User::factory()->role(UserRole::from($role))->create(['password' => 'Lifecycle Test Private!42']);
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => $actor->phone, 'password' => 'Lifecycle Test Private!42'])->assertOk();
        }
        $before = $draft->fresh()->getRawOriginal();
        $method = match ($action) {
            'terms' => 'PUT', 'activation-context' => 'GET', default => 'POST'
        };
        $this->spa($method, "/api/v1/contracts/{$draft->id}/$action", $this->readings())->assertStatus($role === 'anonymous' ? 401 : 403);
        $this->assertSame($before, $draft->fresh()->getRawOriginal());
        $this->assertDatabaseCount('contract_services', 0);
    }

    public function test_terms_snapshot_is_exposed_and_active_contract_cannot_change_it(): void
    {
        $this->admin();
        $draft = $this->draft();
        $url = "/api/v1/contracts/{$draft->id}";
        $this->spa('PUT', "$url/terms", ['early_termination_fee_type' => 'rent_multiple', 'early_termination_fee_multiplier' => '1.50',
            'early_termination_waiver_conditions' => [['code' => 'NOTICE', 'description' => 'Điều kiện đã ký']]])->assertOk()
            ->assertJsonPath('data.early_termination_fee_multiplier', '1.50');
        $this->spa('POST', "$url/activate", $this->readings())->assertOk();
        $this->spa('PUT', "$url/terms", ['early_termination_fee_type' => 'none'])->assertConflict();
        $this->assertSame('1.50', $draft->fresh()->early_termination_fee_multiplier);
    }

    public function test_held_draft_cannot_change_receipt_identity_or_be_deleted(): void
    {
        $this->admin();
        $draft = $this->draft(1000);
        $url = "/api/v1/contracts/{$draft->id}";
        $this->spa('POST', "$url/deposit", ['confirmed' => true, 'expected_amount' => 1000])->assertOk();
        foreach (['deposit_amount' => 2000, 'room_id' => Room::factory()->create()->id, 'user_id' => User::factory()->create()->id] as $field => $value) {
            $this->spa('PATCH', $url, [$field => $value])->assertConflict();
        }
        $this->spa('DELETE', $url)->assertConflict();
        $this->spa('PATCH', $url, ['note' => 'Ghi chú hợp lệ'])->assertOk();
        $this->assertSame(1000, $draft->fresh()->deposit_amount);
        $this->assertSame('Ghi chú hợp lệ', $draft->fresh()->note);
    }

    public function test_missing_terms_and_invalid_or_forged_payloads_are_rejected(): void
    {
        $this->admin();
        $draft = $this->draft(1000);
        $url = "/api/v1/contracts/{$draft->id}";
        $this->spa('POST', "$url/deposit", ['confirmed' => false, 'expected_amount' => 1000])->assertUnprocessable();
        $this->spa('POST', "$url/deposit", ['confirmed' => true, 'expected_amount' => 1000, 'deposit_paid_at' => '2020-01-01'])->assertUnprocessable();
        foreach (['-1', '1.001', '100000000.00', 100, true, ''] as $invalid) {
            $this->spa('POST', "$url/activate", array_replace($this->readings(), ['initial_electricity_reading' => $invalid]))->assertUnprocessable();
        }
        $this->spa('POST', "$url/activate", [...$this->readings(), 'role' => 'admin'])->assertUnprocessable();
        $this->spa('PUT', "$url/terms", ['early_termination_fee_type' => null])->assertOk();
        $this->spa('POST', "$url/activate", $this->readings())->assertUnprocessable()->assertJsonValidationErrors('early_termination_fee_type');
        $this->spa('PUT', "$url/terms", ['early_termination_fee_type' => 'fixed'])->assertUnprocessable();
        $this->spa('POST', "$url/deposit", ['confirmed' => true, 'expected_amount' => 1000], sendCsrf: false)->assertStatus(419);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_latest_readings_require_order_and_explicit_gap_confirmation(): void
    {
        $actor = $this->admin();
        $draft = $this->draft();
        $electricity = Service::where('code', 'ELECTRICITY')->firstOrFail();
        MeterReading::factory()->create(['room_id' => $draft->room_id, 'service_id' => $electricity->id, 'contract_id' => null, 'reading_date' => $draft->start_date, 'current_reading' => '110.00']);
        $url = "/api/v1/contracts/{$draft->id}";
        $this->spa('GET', "$url/activation-context")->assertOk()->assertJsonPath('data.ELECTRICITY.current_reading', '110.00');
        $this->spa('POST', "$url/activate", $this->readings())->assertUnprocessable()->assertJsonValidationErrors('initial_electricity_reading');
        $input = array_replace($this->readings(), ['initial_electricity_reading' => '115.00']);
        $this->spa('POST', "$url/activate", $input)->assertUnprocessable()->assertJsonValidationErrors('meter_gap_reason');
        $this->spa('POST', "$url/activate", [...$input, 'meter_gap_reason' => 'Tiêu thụ khi phòng trống', 'meter_gap_confirmed' => true])->assertOk();
        $this->assertSame($actor->id, $draft->fresh()->meter_gap_confirmed_by);
        $this->assertDatabaseCount('meter_readings', 1);
    }

    public function test_conflicting_room_and_tenant_are_checked_again_during_activation(): void
    {
        $this->admin();
        $draft = $this->draft();
        $other = Contract::factory()->active()->create(['room_id' => $draft->room_id]);
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertConflict();
        $other->status = ContractStatus::Draft;
        $other->save();
        $other = Contract::factory()->active()->create(['user_id' => $draft->user_id]);
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertConflict();
        $this->assertSame(ContractStatus::Draft, $draft->fresh()->status);
        $this->assertDatabaseCount('contract_services', 0);
    }

    public function test_missing_system_service_fails_safely_and_failure_rolls_back_all_changes(): void
    {
        $this->admin();
        $draft = $this->draft();
        $water = Service::where('code', 'WATER')->firstOrFail();
        $water->delete();
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertStatus(503);
        Service::factory()->metered('WATER', 'm3')->create();
        Event::listen('eloquent.updating: '.User::class, function ($user) use ($draft) {
            if ($user->id === $draft->user_id) {
                throw new \RuntimeException('Injected rollback verification');
            }
        });
        try {
            $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertStatus(500);
        } finally {
            Event::forget('eloquent.updating: '.User::class);
        }
        $this->assertSame(ContractStatus::Draft, $draft->fresh()->status);
        $this->assertSame(RoomStatus::Available, $draft->room->fresh()->status);
        $this->assertSame(UserRole::User, $draft->tenant->fresh()->role);
        $this->assertDatabaseCount('contract_services', 0);
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_stale_signing_or_receipt_context_is_rejected_even_when_deposit_amount_does_not_change(): void
    {
        $this->admin();
        $draft = $this->draft(1000);
        $revision = $this->spa('GET', "/api/v1/contracts/{$draft->id}")->json('data.lifecycle_revision');
        $this->spa('PATCH', "/api/v1/contracts/{$draft->id}", ['user_id' => User::factory()->create()->id])->assertOk();
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/deposit", ['confirmed' => true, 'expected_amount' => 1000, 'expected_revision' => $revision])->assertConflict();
        $this->assertSame(DepositStatus::Unpaid, $draft->fresh()->deposit_status);
        $draft->deposit_amount = 0;
        $draft->save();
        $revision = $this->spa('GET', "/api/v1/contracts/{$draft->id}")->json('data.lifecycle_revision');
        $this->spa('PUT', "/api/v1/contracts/{$draft->id}/terms", ['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 500000])->assertOk();
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", [...$this->readings(), 'expected_revision' => $revision])->assertConflict();
        $this->assertSame(ContractStatus::Draft, $draft->fresh()->status);
    }

    public function test_vacancy_readings_after_prior_final_do_not_prevent_next_tenant_activation(): void
    {
        $this->admin();
        $draft = $this->draft();
        $prior = Contract::factory()->terminated()->create(['room_id' => $draft->room_id, 'start_date' => '2026-08-01', 'end_date' => '2026-08-31', 'actual_end_date' => '2026-09-01']);
        foreach (Service::whereIn('code', ['ELECTRICITY', 'WATER'])->get() as $service) {
            MeterReading::factory()->final()->create(['room_id' => $draft->room_id, 'service_id' => $service->id, 'contract_id' => $prior->id,
                'period' => '2026-09-01', 'reading_date' => '2026-09-01', 'current_reading' => '5.00']);
            MeterReading::factory()->create(['room_id' => $draft->room_id, 'service_id' => $service->id, 'contract_id' => null,
                'period' => '2026-09-01', 'reading_date' => '2026-09-30', 'current_reading' => '10.00']);
        }
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", ['initial_electricity_reading' => '10.00', 'initial_water_reading' => '10.00', 'meter_gap_reason' => null, 'meter_gap_confirmed' => false])->assertOk();
        $this->assertDatabaseCount('meter_readings', 4);
    }

    public function test_locked_admin_and_missing_schema_do_not_open_lifecycle_writes(): void
    {
        $actor = $this->admin();
        $draft = $this->draft();
        $actor->status = UserStatus::Locked;
        $actor->save();
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertForbidden();
        $this->assertSame(ContractStatus::Draft, $draft->fresh()->status);
        $this->admin();
        Schema::shouldReceive('hasTable')->andReturnUsing(fn ($table) => $table !== 'meter_readings');
        Schema::shouldReceive('hasColumns')->andReturnFalse();
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertStatus(503);
    }

    public function test_existing_metered_draft_line_or_future_reading_blocks_activation_without_partial_write(): void
    {
        $this->admin();
        $draft = $this->draft();
        $electricity = Service::where('code', 'ELECTRICITY')->firstOrFail();
        $line = $draft->contractServices()->create(['service_id' => $electricity->id, 'quantity' => '1.00', 'unit_price' => null, 'start_date' => $draft->start_date]);
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertConflict();
        $line->delete();
        MeterReading::factory()->create(['room_id' => $draft->room_id, 'service_id' => $electricity->id, 'reading_date' => '2026-11-01', 'current_reading' => '1.00']);
        $this->spa('POST', "/api/v1/contracts/{$draft->id}/activate", $this->readings())->assertUnprocessable();
        $this->assertSame(ContractStatus::Draft, $draft->fresh()->status);
        $this->assertDatabaseCount('contract_services', 0);
    }
}
