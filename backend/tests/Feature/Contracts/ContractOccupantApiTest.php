<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\ContractOccupant;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractOccupantService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Schema;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ContractOccupantApiTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const PASSWORD = 'Occupant test only!42';

    private Contract $contract;

    protected function setUp(): void
    {
        parent::setUp();
        $room = Room::factory()->create(['max_occupants' => 4]);
        $this->contract = Contract::factory()->create(['room_id' => $room->id, 'occupant_count' => 2]);
        $this->initializeSpaClient();
    }

    private function login(UserRole $role = UserRole::Admin): User
    {
        $actor = User::factory()->role($role)->create(['password' => self::PASSWORD]);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $actor->phone, 'password' => self::PASSWORD])->assertOk();

        return $actor;
    }

    private function url(?Contract $contract = null): string
    {
        return '/api/v1/contracts/'.($contract ?? $this->contract)->id.'/occupants';
    }

    private function version(): string
    {
        return $this->spa('GET', $this->url())->assertOk()->json('data.revision');
    }

    private function input(?string $revision = null): array
    {
        return ['expected_revision' => $revision ?? $this->version(), 'full_name' => '  Người ở cùng kiểm thử  ',
            'phone' => ' ', 'relationship' => '  Bạn  '];
    }

    public function test_all_routes_require_active_admin_cookie_and_csrf(): void
    {
        foreach (['GET', 'POST', 'PATCH', 'DELETE'] as $method) {
            $this->spa($method, $this->url().(in_array($method, ['PATCH', 'DELETE']) ? '/1' : ''))->assertUnauthorized();
        }
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            foreach (['GET', 'POST', 'PATCH', 'DELETE'] as $method) {
                $this->spa($method, $this->url().(in_array($method, ['PATCH', 'DELETE']) ? '/1' : ''))->assertForbidden();
            }
        }
        $admin = $this->login();
        $this->spa('POST', $this->url(), $this->input(), sendCsrf: false)->assertStatus(419);
        $admin->forceFill(['status' => 'locked'])->save();
        $this->spa('GET', $this->url())->assertForbidden();
        $this->spa('GET', $this->url())->assertUnauthorized();
        $this->assertSame(0, ContractOccupant::count());
    }

    public function test_real_empty_list_has_whitelisted_summary_without_automatic_count_change(): void
    {
        $this->login();
        $data = $this->spa('GET', $this->url())->assertOk()->assertJsonPath('data.occupants', [])
            ->assertJsonPath('data.registered_count', 1)->assertJsonPath('data.occupant_count', 2)
            ->assertJsonPath('data.has_count_mismatch', true)->assertJsonPath('data.can_edit', true)->json('data');
        $this->assertSame(['contract_id', 'contract_status', 'occupant_count', 'max_occupants', 'registered_count',
            'has_count_mismatch', 'can_edit', 'revision', 'occupants'], array_keys($data));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $data['revision']);
    }

    public function test_draft_crud_normalizes_nulls_and_preserves_contract_and_financial_rows(): void
    {
        $this->login();
        $before = $this->contract->fresh()->getRawOriginal();
        $response = $this->spa('POST', $this->url(), $this->input())->assertCreated()
            ->assertJsonPath('data.has_count_mismatch', false)->assertJsonPath('data.registered_count', 2);
        $row = $response->json('data.occupants.0');
        $this->assertSame(['id', 'full_name', 'phone', 'relationship'], array_keys($row));
        $this->assertSame('Người ở cùng kiểm thử', $row['full_name']);
        $this->assertNull($row['phone']);
        $this->assertSame('Bạn', $row['relationship']);
        $edited = $this->spa('PATCH', $this->url().'/'.$row['id'], [
            'expected_revision' => $response->json('data.revision'), 'full_name' => 'Tên đã sửa',
            'phone' => '0901234567', 'relationship' => null,
        ])->assertOk()->assertJsonPath('data.occupants.0.phone', '0901234567');
        $this->spa('DELETE', $this->url().'/'.$row['id'], ['expected_revision' => $edited->json('data.revision')])->assertNoContent();
        $this->assertSame($before, $this->contract->fresh()->getRawOriginal());
        foreach (['contract_services', 'invoices', 'payments'] as $table) {
            $this->assertSame(0, DB::table($table)->count());
        }
        $this->assertSame(0, ContractOccupant::count());
    }

    public function test_mismatch_is_warning_but_actual_capacity_is_enforced(): void
    {
        $this->login();
        for ($i = 0; $i < 3; $i++) {
            $this->spa('POST', $this->url(), $this->input())->assertCreated();
        }
        $this->spa('GET', $this->url())->assertJsonPath('data.registered_count', 4)->assertJsonPath('data.has_count_mismatch', true);
        $this->spa('POST', $this->url(), $this->input())->assertUnprocessable()->assertJsonValidationErrors('full_name');
        $this->assertSame(3, ContractOccupant::count());
        $this->assertSame(2, $this->contract->fresh()->occupant_count);
    }

    public function test_validation_rejects_spoofed_fields_and_lengths_without_writes(): void
    {
        $this->login();
        $base = $this->input();
        foreach (['full_name' => ' ', 'phone' => str_repeat('1', 21), 'relationship' => str_repeat('x', 51),
            'expected_revision' => 'bad'] as $field => $value) {
            $this->spa('POST', $this->url(), array_replace($base, [$field => $value]))->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->spa('POST', $this->url(), array_replace($base, ['full_name' => str_repeat('a', 121)]))->assertUnprocessable();
        $this->spa('POST', $this->url(), array_replace($base, ['phone' => false]))->assertUnprocessable();
        $this->spa('POST', $this->url(), array_replace($base, ['contract_id' => 9, 'occupant_count' => 99, 'role' => 'admin']))
            ->assertUnprocessable()->assertJsonValidationErrors(['contract_id', 'occupant_count', 'role']);
        $this->spa('GET', $this->url().'?q=x')->assertUnprocessable();
        $this->spa('POST', $this->url(), ['full_name' => 'Tên'])->assertUnprocessable()->assertJsonValidationErrors('expected_revision');
        $this->assertSame(0, ContractOccupant::count());
    }

    public function test_active_terminated_and_expired_are_read_only_and_missing_contract_is_404(): void
    {
        $this->login();
        $row = $this->contract->occupants()->create(['full_name' => 'Lịch sử']);
        foreach (['active', 'terminated', 'expired'] as $status) {
            $this->contract->forceFill(['status' => $status])->save();
            $this->spa('GET', $this->url())->assertOk()->assertJsonPath('data.can_edit', false);
            $data = $this->input();
            $this->spa('POST', $this->url(), $data)->assertConflict();
            $this->spa('PATCH', $this->url().'/'.$row->id, $data)->assertConflict();
            $this->spa('DELETE', $this->url().'/'.$row->id, ['expected_revision' => $data['expected_revision']])->assertConflict();
        }
        $this->contract->delete();
        $this->spa('GET', $this->url())->assertNotFound();
        $this->spa('GET', '/api/v1/contracts/999999/occupants')->assertNotFound();
        $this->assertSame(1, ContractOccupant::count());
    }

    public function test_cross_parent_and_repeated_delete_are_404_without_modifying_other_rows(): void
    {
        $this->login();
        $other = Contract::factory()->create();
        $row = $other->occupants()->create(['full_name' => 'Khác hợp đồng']);
        $this->spa('PATCH', $this->url().'/'.$row->id, $this->input())->assertNotFound();
        $this->spa('DELETE', $this->url().'/'.$row->id, ['expected_revision' => $this->version()])->assertNotFound();
        $this->assertNotNull($row->fresh());
        $own = $this->spa('POST', $this->url(), $this->input())->assertCreated()->json('data.occupants.0.id');
        $revision = $this->version();
        $this->spa('DELETE', $this->url().'/'.$own, ['expected_revision' => $revision])->assertNoContent();
        $this->spa('DELETE', $this->url().'/'.$own, ['expected_revision' => $revision])->assertNotFound();
    }

    public function test_stale_replay_and_contract_edits_are_detected_even_in_same_second(): void
    {
        $this->login();
        $beforeLifecycle = $this->contract->fresh()->lifecycleRevision();
        $input = $this->input();
        $this->spa('POST', $this->url(), $input)->assertCreated();
        $this->spa('POST', $this->url(), $input)->assertConflict();
        $this->assertNotSame($beforeLifecycle, $this->contract->fresh()->lifecycleRevision());
        $input = $this->input();
        $this->contract->forceFill(['note' => 'Vừa sửa trong phiên khác'])->save();
        $this->spa('POST', $this->url(), $input)->assertConflict();
        $this->assertSame(1, ContractOccupant::count());
    }

    public function test_room_capacity_change_is_detected_and_delete_can_reduce_over_capacity_history(): void
    {
        $this->login();
        $row = $this->spa('POST', $this->url(), $this->input())->assertCreated()->json('data.occupants.0.id');
        $stale = $this->version();
        $this->contract->room->forceFill(['max_occupants' => 1])->save();
        $this->spa('PATCH', $this->url().'/'.$row, ['expected_revision' => $stale, 'full_name' => 'Tên mới'])->assertConflict();
        $this->spa('POST', $this->url(), $this->input())->assertUnprocessable();
        $this->spa('DELETE', $this->url().'/'.$row, ['expected_revision' => $this->version()])->assertNoContent();
        $this->assertSame(2, $this->contract->fresh()->occupant_count);
    }

    public function test_moving_draft_to_smaller_room_checks_known_occupants_not_only_declared_count(): void
    {
        $this->login();
        $this->contract->forceFill(['occupant_count' => 1])->save();
        $this->spa('POST', $this->url(), $this->input())->assertCreated();
        $small = Room::factory()->create(['max_occupants' => 1]);
        $this->spa('PATCH', '/api/v1/contracts/'.$this->contract->id, ['room_id' => $small->id])
            ->assertUnprocessable()->assertJsonValidationErrors('room_id');
        $this->assertNotSame($small->id, $this->contract->fresh()->room_id);
    }

    public function test_sql_failure_is_sanitized_and_transaction_keeps_existing_rows(): void
    {
        $this->login();
        $fail = true;
        ContractOccupant::creating(function () use (&$fail): void {
            if ($fail) {
                throw new QueryException('mysql_test', 'select secret personal input', [], new \RuntimeException('Private data'));
            }
        });
        Exceptions::fake();
        try {
            $response = $this->spa('POST', $this->url(), $this->input())->assertStatus(500);
            $this->assertStringNotContainsString('Private data', $response->getContent());
            $this->assertStringNotContainsString('select secret', $response->getContent());
            Exceptions::assertReported(fn (\RuntimeException $e) => $e->getMessage() === 'Thao tác hồ sơ người ở cùng thất bại do lỗi CSDL.');
        } finally {
            $fail = false;
        }
        $this->assertSame(0, ContractOccupant::count());
    }

    public function test_activation_rechecks_known_capacity_and_preserves_services_and_room_on_failure(): void
    {
        $this->login();
        $this->contract->forceFill(['occupant_count' => 1, 'deposit_amount' => 0, 'early_termination_fee_type' => 'none'])->save();
        $this->spa('POST', $this->url(), $this->input())->assertCreated();
        $this->contract->room->forceFill(['max_occupants' => 1])->save();
        Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        Service::factory()->metered('WATER', 'm3')->create();
        $this->spa('POST', '/api/v1/contracts/'.$this->contract->id.'/activate', [
            'expected_revision' => $this->contract->fresh()->lifecycleRevision(),
            'initial_electricity_reading' => '0.00', 'initial_water_reading' => '0.00',
            'meter_gap_reason' => null, 'meter_gap_confirmed' => false,
        ])->assertUnprocessable()->assertJsonValidationErrors('room_id');
        $this->assertSame('draft', $this->contract->fresh()->status->value);
        $this->assertSame('available', $this->contract->room->fresh()->status->value);
        $this->assertSame(0, DB::table('contract_services')->count());
    }

    public function test_service_rechecks_current_actor_permissions_and_pending_schema_returns_503(): void
    {
        $admin = $this->login();
        $input = $this->input();
        $admin->forceFill(['status' => 'locked'])->save();
        try {
            app(ContractOccupantService::class)->store((string) $this->contract->id, $admin, $input);
            $this->fail('Locked actor accepted');
        } catch (AuthorizationException) {
            $this->assertSame(0, ContractOccupant::count());
        }
        $this->login();
        Schema::shouldReceive('getTableListing')->with(null, false)->andReturn([]);
        $this->spa('GET', $this->url())->assertStatus(503);
    }
}
