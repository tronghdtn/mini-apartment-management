<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\ContractOccupant;
use App\Models\ContractService;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ResidentContractTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function login(UserRole $role = UserRole::Resident): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Resident contract test!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Resident contract test!42'])->assertOk();

        return $user;
    }

    public function test_auth_roles_locked_and_owner_scope_including_draft_and_soft_deleted_history(): void
    {
        $this->spa('GET', '/api/v1/resident/contracts')->assertUnauthorized();
        $this->spa('GET', '/api/v1/resident/contracts/1')->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Admin, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('GET', '/api/v1/resident/contracts')->assertForbidden();
            $this->spa('GET', '/api/v1/resident/contracts/1')->assertForbidden();
        }
        $owner = $this->login();
        $own = Contract::factory()->active()->create(['user_id' => $owner->id, 'contract_number' => 'HD-TEST-0001']);
        $old = Contract::factory()->terminated()->create(['user_id' => $owner->id, 'contract_number' => 'HD-TEST-0002']);
        $old->delete();
        $draft = Contract::factory()->create(['user_id' => $owner->id]);
        $foreign = Contract::factory()->active()->create();
        $this->spa('GET', '/api/v1/resident/contracts')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 2);
        $this->spa('GET', '/api/v1/resident/contracts/'.$old->id)->assertOk()->assertJsonPath('data.status', 'terminated');
        $this->spa('GET', '/api/v1/resident/contracts/'.$draft->id)->assertNotFound();
        $this->spa('GET', '/api/v1/resident/contracts/'.$foreign->id)->assertNotFound();
        $this->spa('GET', '/api/v1/contracts/'.$own->id)->assertForbidden(); // Admin projection remains protected.
        User::whereKey($owner->id)->update(['status' => 'locked']);
        $this->spa('GET', '/api/v1/resident/contracts')->assertForbidden();
    }

    public function test_readonly_snapshot_projection_excludes_internal_and_private_contact_fields(): void
    {
        $owner = $this->login();
        $contract = Contract::factory()->active()->create(['user_id' => $owner->id, 'contract_number' => 'HD-TEST-0010',
            'early_termination_fee_type' => 'rent_multiple', 'early_termination_fee_multiplier' => '1.50',
            'early_termination_waiver_conditions' => [['code' => 'SIGNED', 'description' => 'Điều kiện đã thỏa thuận']],
            'note' => 'ADMIN INTERNAL', 'meter_gap_reason' => 'ADMIN INTERNAL']);
        $occupant = new ContractOccupant(['full_name' => 'Người ở cùng', 'phone' => '0901234567', 'relationship' => 'Gia đình']);
        $contract->occupants()->save($occupant);
        $service = Service::factory()->create(['billing_type' => 'per_room', 'price' => 100000]);
        $line = new ContractService;
        $line->forceFill(['contract_id' => $contract->id, 'service_id' => $service->id, 'unit_price' => 90000, 'quantity' => '1.00', 'start_date' => '2026-10-01'])->save();
        $response = $this->spa('GET', '/api/v1/resident/contracts/'.$contract->id)->assertOk()
            ->assertJsonPath('data.planned_handover_date', '2027-10-02')
            ->assertJsonPath('data.early_termination_fee_multiplier', '1.50')
            ->assertJsonPath('data.initial_electricity_reading', '100.00')
            ->assertJsonPath('data.contract_services.0.unit_price', 90000)
            ->assertJsonPath('data.contract_services.0.quantity', '1.00')
            ->assertJsonPath('data.occupants.0.full_name', 'Người ở cùng')
            ->assertJsonPath('data.inspection_result', null)->assertJsonPath('data.final_invoice_id', null)
            ->assertJsonPath('data.early_termination_waiver_conditions.0.description', 'Điều kiện đã thỏa thuận');
        $data = $response->json('data');
        foreach (['note', 'meter_gap_reason', 'user_id', 'tenant', 'lifecycle_revision', 'deleted_at', 'early_termination_waived_by'] as $field) {
            $this->assertArrayNotHasKey($field, $data);
        }
        $this->assertArrayNotHasKey('phone', $data['occupants'][0]);
        $this->assertArrayNotHasKey('id_number', $data['occupants'][0]);
        Service::whereKey($service->id)->update(['price' => 200000]);
        $this->spa('GET', '/api/v1/resident/contracts/'.$contract->id)->assertJsonPath('data.contract_services.0.unit_price', 90000);
        $this->spa('POST', '/api/v1/resident/contracts/'.$contract->id, ['monthly_rent' => 1])->assertStatus(405);
        $this->assertDatabaseHas('contracts', ['id' => $contract->id, 'monthly_rent' => 3500000, 'status' => 'active']);
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_filters_pagination_empty_and_invalid_query_do_not_expand_scope(): void
    {
        $owner = $this->login();
        Contract::factory()->terminated()->count(21)->create(['user_id' => $owner->id]);
        Contract::factory()->terminated()->create();
        $this->spa('GET', '/api/v1/resident/contracts?status=terminated&page=2')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 21);
        $this->spa('GET', '/api/v1/resident/contracts?status=active')->assertOk()->assertJsonCount(0, 'data');
        foreach (['status=draft', 'page=0', 'page=2147483648', 'user_id=1'] as $query) {
            $this->spa('GET', '/api/v1/resident/contracts?'.$query)->assertUnprocessable();
        }
        $this->spa('GET', '/api/v1/resident/contracts/999999')->assertNotFound();
    }
}
