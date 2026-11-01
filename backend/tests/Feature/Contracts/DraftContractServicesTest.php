<?php

namespace Tests\Feature\Contracts;

use App\Enums\ContractStatus;
use App\Enums\ServiceBillingType;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Contract;
use App\Models\ContractService as ServiceLine;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class DraftContractServicesTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function login(UserRole $role = UserRole::Admin): User
    {
        $actor = User::factory()->role($role)->create(['password' => 'Services Test Only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $actor->email, 'password' => 'Services Test Only!42'])->assertOk();

        return $actor;
    }

    private function save(Contract $contract, array $services): TestResponse
    {
        return $this->spa('PUT', '/api/v1/contracts/'.$contract->id.'/services', compact('services'));
    }

    public function test_catalog_prices_are_snapshotted_and_not_repriced_on_quantity_or_catalog_change(): void
    {
        $this->login();
        $contract = Contract::factory()->create();
        $before = $contract->fresh()->getRawOriginal();
        $room = $contract->room->getRawOriginal();
        $tenant = $contract->tenant->getRawOriginal();
        $service = Service::factory()->create(['billing_type' => ServiceBillingType::PerPerson, 'price' => 123456]);
        $this->save($contract, [['service_id' => $service->id, 'quantity' => 2]])->assertOk()
            ->assertJsonPath('data.contract_services.0.unit_price', 123456)->assertJsonPath('data.contract_services.0.quantity', '2.00');
        $lineId = $contract->contractServices()->sole()->id;
        $service->update(['price' => 234567]);
        $this->save($contract, [['service_id' => $service->id, 'quantity' => 3]])->assertOk()
            ->assertJsonPath('data.contract_services.0.id', $lineId)->assertJsonPath('data.contract_services.0.unit_price', 123456);
        $this->spa('GET', '/api/v1/contracts/'.$contract->id)->assertOk()->assertJsonPath('data.contract_services.0.quantity', '3.00');
        $this->spa('GET', '/api/v1/contracts')->assertOk()->assertJsonMissingPath('data.0.contract_services');
        $this->assertSame($room, $contract->room->fresh()->getRawOriginal());
        $this->assertSame($tenant, $contract->tenant->fresh()->getRawOriginal());
        $after = $contract->fresh()->getRawOriginal();
        unset($before['updated_at'], $after['updated_at']);
        $this->assertSame($before, $after);
        $this->save($contract, [])->assertOk()->assertJsonCount(0, 'data.contract_services');
        $this->save($contract, [['service_id' => $service->id, 'quantity' => 1]])->assertOk()->assertJsonPath('data.contract_services.0.unit_price', 234567);
    }

    public static function deniedRoles(): array
    {
        return [['anonymous'], ['user'], ['resident'], ['technician'], ['guard'], ['locked_admin']];
    }

    #[DataProvider('deniedRoles')]
    public function test_role_and_locked_account_are_enforced_on_backend(string $role): void
    {
        if ($role !== 'anonymous') {
            $actor = $this->login($role === 'locked_admin' ? UserRole::Admin : UserRole::from($role));
            if ($role === 'locked_admin') {
                $actor->status = UserStatus::Locked;
                $actor->save();
            }
        }
        $contract = Contract::factory()->create();
        $this->save($contract, [])->assertStatus($role === 'anonymous' ? 401 : 403);
        $this->assertSame(0, $contract->contractServices()->count());
    }

    public static function invalidQuantities(): array
    {
        return [[0], [-1], [1.5], [100000000], [true], [null], ['wrong']];
    }

    #[DataProvider('invalidQuantities')]
    public function test_invalid_quantity_does_not_write_any_row(mixed $quantity): void
    {
        $this->login();
        $contract = Contract::factory()->create();
        $service = Service::factory()->create(['billing_type' => ServiceBillingType::PerUnit]);
        $this->save($contract, [['service_id' => $service->id, 'quantity' => $quantity]])->assertUnprocessable()->assertJsonValidationErrors('services.0.quantity');
        $this->assertSame(0, $contract->contractServices()->count());
    }

    public function test_all_rows_are_validated_before_replacing_the_selection(): void
    {
        $this->login();
        $contract = Contract::factory()->create();
        $valid = Service::factory()->create();
        $this->save($contract, [['service_id' => $valid->id, 'quantity' => 1]])->assertOk();
        $before = $contract->contractServices()->get()->toJson();
        $inactive = Service::factory()->create(['status' => ServiceStatus::Inactive]);
        $electricity = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        foreach ([$inactive->id, $electricity->id, 99999999] as $id) {
            $this->save($contract, [['service_id' => $valid->id, 'quantity' => 1], ['service_id' => $id, 'quantity' => 1]])
                ->assertUnprocessable()->assertJsonValidationErrors('services.1.service_id');
            $this->assertSame($before, $contract->contractServices()->get()->toJson());
        }
        $this->save($contract, [['service_id' => $valid->id, 'quantity' => 2]])->assertUnprocessable()->assertJsonValidationErrors('services.0.quantity');
        $this->save($contract, [['service_id' => $valid->id, 'quantity' => 1], ['service_id' => (string) $valid->id, 'quantity' => 1]])->assertUnprocessable();
        $this->assertSame($before, $contract->contractServices()->get()->toJson());
        $valid->update(['status' => ServiceStatus::Inactive]);
        $this->spa('GET', '/api/v1/contracts/'.$contract->id)->assertOk()->assertJsonPath('data.contract_services.0.service.status', 'inactive');
        $this->save($contract, [])->assertOk();
    }

    public function test_forged_prices_dates_status_unknown_fields_and_bad_arrays_are_rejected(): void
    {
        $this->login();
        $contract = Contract::factory()->create();
        $service = Service::factory()->create();
        $line = ['service_id' => $service->id, 'quantity' => 1];
        foreach (['unit_price', 'price', 'start_date', 'end_date', 'status', 'contract_id', 'anything'] as $field) {
            $this->save($contract, [$line + [$field => null]])->assertUnprocessable();
            $this->spa('PUT', '/api/v1/contracts/'.$contract->id.'/services', ['services' => [$line], $field => null])->assertUnprocessable();
        }
        foreach ([[], ['services' => null], ['services' => 'wrong'], ['services' => [1 => $line]]] as $body) {
            $this->spa('PUT', '/api/v1/contracts/'.$contract->id.'/services', $body)->assertUnprocessable();
        }
        $this->assertSame(0, $contract->contractServices()->count());
    }

    public function test_non_drafts_history_and_missing_targets_are_protected(): void
    {
        $this->login();
        foreach ([ContractStatus::Terminated, ContractStatus::Expired] as $status) {
            $contract = Contract::factory()->create(['status' => $status]);
            $this->save($contract, [])->assertConflict();
        }
        // Hợp đồng active dùng luồng thay đổi từ tháng sau, bắt buộc phiên bản đã đọc (ActiveContractServicesTest).
        $active = Contract::factory()->active()->create();
        $this->save($active, [])->assertUnprocessable()->assertJsonValidationErrors('expected_revision');
        $contract = Contract::factory()->create();
        $service = Service::factory()->create();
        $contract->contractServices()->create(['service_id' => $service->id, 'quantity' => 1, 'unit_price' => 50, 'start_date' => '2026-11-01']);
        $this->save($contract, [])->assertConflict();
        $this->spa('PUT', '/api/v1/contracts/99999999/services', ['services' => []])->assertNotFound();
        $this->spa('PUT', '/api/v1/contracts/not-an-id/services', ['services' => []])->assertNotFound();
        $this->spa('PUT', '/api/v1/contracts/'.$contract->id.'/services', ['services' => []], ['HTTP_ORIGIN' => 'https://other.example.test', 'HTTP_SEC_FETCH_SITE' => 'cross-site'], false)->assertStatus(419);
    }

    public function test_draft_start_date_moves_simple_rows_but_keeps_their_price_and_quantity(): void
    {
        $this->login();
        $contract = Contract::factory()->create();
        $service = Service::factory()->create();
        $this->save($contract, [['service_id' => $service->id, 'quantity' => 1]])->assertOk();
        $this->spa('PATCH', '/api/v1/contracts/'.$contract->id, ['start_date' => '2026-11-01'])->assertOk()
            ->assertJsonPath('data.contract_services.0.start_date', '2026-11-01')->assertJsonPath('data.contract_services.0.unit_price', $service->price);
        $this->assertSame('1.00', $contract->contractServices()->sole()->quantity);
    }

    public function test_sql_failure_rolls_back_every_line_and_does_not_expose_bindings(): void
    {
        $this->login();
        $contract = Contract::factory()->create();
        $first = Service::factory()->create();
        $second = Service::factory()->create();
        $this->save($contract, [['service_id' => $first->id, 'quantity' => 1]])->assertOk();
        $before = DB::table('contract_services')->get()->toJson();
        Exceptions::fake();
        Event::listen('eloquent.creating: '.ServiceLine::class, function (ServiceLine $line): void {
            $line->quantity = null;
        });
        $this->save($contract, [['service_id' => $first->id, 'quantity' => 1], ['service_id' => $second->id, 'quantity' => 1]])->assertStatus(500)->assertDontSee('SQLSTATE');
        $this->assertSame($before, DB::table('contract_services')->get()->toJson());
        Exceptions::assertReported(RuntimeException::class);
        Exceptions::assertNotReported(QueryException::class);
    }
}
