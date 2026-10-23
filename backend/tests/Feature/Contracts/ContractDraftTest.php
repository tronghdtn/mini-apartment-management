<?php

namespace Tests\Feature\Contracts;

use App\Enums\ContractStatus;
use App\Enums\RoomStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

/** CTR-A: chỉ đọc và CRUD bản nháp; không kích hoạt, thu cọc hay thay đổi lịch sử. */
class ContractDraftTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const PASSWORD = 'Contract Test Private!42';

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $actor = User::factory()->role($role)->create(['password' => self::PASSWORD]);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $actor->email, 'password' => self::PASSWORD])->assertOk();

        return $actor;
    }

    private function input(?Room $room = null, ?User $tenant = null): array
    {
        $room ??= Room::factory()->create(['max_occupants' => 3]);
        $tenant ??= User::factory()->create();

        return [
            'room_id' => $room->id, 'user_id' => $tenant->id,
            'start_date' => '2026-10-01', 'end_date' => '2027-09-30',
            'monthly_rent' => 3500000, 'deposit_amount' => 2000000, 'occupant_count' => 2,
            'note' => 'Ghi chú hợp đồng nháp',
        ];
    }

    private function snapshot(array $tables): array
    {
        $result = [];
        foreach ($tables as $table) {
            $result[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }

        return $result;
    }

    public static function endpoints(): array
    {
        return ['index' => ['GET', ''], 'show' => ['GET', '/%d'], 'store' => ['POST', ''], 'update' => ['PATCH', '/%d'], 'destroy' => ['DELETE', '/%d']];
    }

    public static function deniedEndpoints(): array
    {
        $cases = [];
        foreach (['anonymous', 'user', 'resident', 'technician', 'guard', 'locked_admin'] as $role) {
            foreach (self::endpoints() as $action => [$method, $suffix]) {
                $cases[$role.' '.$action] = [$role, $method, $suffix];
            }
        }

        return $cases;
    }

    #[DataProvider('deniedEndpoints')]
    public function test_every_endpoint_rejects_anonymous_other_roles_and_a_previously_signed_in_locked_admin(string $role, string $method, string $suffix): void
    {
        if ($role !== 'anonymous') {
            $actor = $this->signIn($role === 'locked_admin' ? UserRole::Admin : UserRole::from($role));
            if ($role === 'locked_admin') {
                $actor->status = UserStatus::Locked;
                $actor->save();
            }
        }
        $draft = Contract::factory()->create();
        $input = $this->input();
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        $url = '/api/v1/contracts'.($suffix === '' ? '' : sprintf($suffix, $draft->id));
        $this->spa($method, $url, $input)->assertStatus($role === 'anonymous' ? 401 : 403);
        $after = $this->snapshot(['contracts', 'rooms', 'users']);
        if ($role === 'locked_admin') {
            // Middleware logout thật xoay remember_token để vô hiệu hóa đăng nhập ghi nhớ.
            // Chỉ khác biệt bảo mật này được phép; mọi tài khoản/trường khác phải giữ nguyên.
            $oldUsers = json_decode($before['users'], true, flags: JSON_THROW_ON_ERROR);
            $newUsers = json_decode($after['users'], true, flags: JSON_THROW_ON_ERROR);
            $oldActor = array_values(array_filter($oldUsers, fn ($row) => $row['id'] === $actor->id))[0];
            foreach ($newUsers as &$row) {
                if ($row['id'] === $actor->id) {
                    $this->assertNotSame($oldActor['remember_token'], $row['remember_token']);
                    $row['remember_token'] = $oldActor['remember_token'];
                }
            }
            unset($row);
            $after['users'] = json_encode($newUsers, JSON_THROW_ON_ERROR);
            $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
        }
        $this->assertSame($before, $after);
    }

    public function test_admin_creates_a_draft_without_activation_and_reads_real_minimal_relations(): void
    {
        $admin = $this->signIn();
        $tenant = User::factory()->create(['id_number' => 'PRIVATE-LEGAL', 'permanent_address' => 'Địa chỉ riêng']);
        $room = Room::factory()->create();
        $input = $this->input($room, $tenant);
        $before = $this->snapshot(['rooms', 'users', 'contract_services', 'contract_occupants', 'invoices', 'invoice_items', 'payments', 'meter_readings']);
        $session = $this->sessionId();
        $response = $this->spa('POST', '/api/v1/contracts', $input)->assertCreated();
        $id = $response->json('data.id');
        $this->assertIsInt($id);
        foreach ($input as $key => $value) {
            $response->assertJsonPath('data.'.$key, $value);
        }
        $response->assertJsonPath('data.status', 'draft')->assertJsonPath('data.contract_number', null)
            ->assertJsonPath('data.actual_end_date', null)->assertJsonPath('data.deposit_status', 'unpaid')
            ->assertJsonPath('data.room.id', $room->id)->assertJsonPath('data.room.code', $room->code)
            ->assertJsonPath('data.room.building.id', $room->building_id)->assertJsonPath('data.tenant.id', $tenant->id)
            ->assertJsonPath('data.tenant.full_name', $tenant->full_name)->assertJsonPath('data.tenant.phone', $tenant->phone);
        $this->assertIsInt($response->json('data.monthly_rent'));
        $this->assertIsInt($response->json('data.deposit_amount'));
        $this->spa('GET', '/api/v1/contracts/'.$id)->assertOk()->assertExactJson($response->json());
        $this->assertDatabaseHas('contracts', ['id' => $id] + $input + ['status' => 'draft', 'activated_at' => null, 'contract_number' => null]);
        $this->assertSame($before, $this->snapshot(array_keys($before)));
        $this->assertSame($session, $this->sessionId());
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $admin->id)->assertJsonPath('data.role', 'admin');
        foreach (['password', 'remember_token', 'id_number', 'date_of_birth', 'gender', 'permanent_address', 'email_verified_at'] as $field) {
            $this->assertArrayNotHasKey($field, $response->json('data.tenant'));
        }
        foreach (['PRIVATE-LEGAL', 'Địa chỉ riêng', $tenant->password] as $sensitive) {
            $this->assertStringNotContainsString($sensitive, $response->getContent());
        }
    }

    public function test_zero_money_max_safe_integer_capacity_boundary_and_null_note_are_supported(): void
    {
        $this->signIn();
        $input = $this->input();
        $input = array_replace($input, ['monthly_rent' => 0, 'deposit_amount' => 9007199254740991, 'occupant_count' => 3, 'note' => null]);
        $this->spa('POST', '/api/v1/contracts', $input)->assertCreated()
            ->assertJsonPath('data.monthly_rent', 0)->assertJsonPath('data.deposit_amount', 9007199254740991)
            ->assertJsonPath('data.occupant_count', 3)->assertJsonPath('data.note', null);
        $input['monthly_rent'] = 9007199254740991;
        $input['deposit_amount'] = 0;
        unset($input['note']);
        $this->spa('POST', '/api/v1/contracts', $input)->assertCreated()->assertJsonPath('data.monthly_rent', 9007199254740991)->assertJsonPath('data.note', null);
    }

    public static function invalidFields(): array
    {
        return [
            'missing room' => ['room_id', null], 'boolean room' => ['room_id', true], 'fractional room' => ['room_id', 1.5], 'array room' => ['room_id', []], 'nonexistent room' => ['room_id', 999999999],
            'missing tenant' => ['user_id', null], 'boolean tenant' => ['user_id', true], 'nonexistent tenant' => ['user_id', 999999999],
            'invalid start' => ['start_date', '2026-02-30'], 'timestamp start' => ['start_date', '2026-10-01T00:00:00Z'], 'null start' => ['start_date', null],
            'same end' => ['end_date', '2026-10-01'], 'earlier end' => ['end_date', '2026-09-30'], 'invalid end' => ['end_date', 'not-a-date'],
            'negative rent' => ['monthly_rent', -1], 'fractional rent' => ['monthly_rent', 1.5], 'boolean rent' => ['monthly_rent', true], 'unsafe rent' => ['monthly_rent', 9007199254740992], 'null rent' => ['monthly_rent', null],
            'negative deposit' => ['deposit_amount', -1], 'fractional deposit' => ['deposit_amount', 1.5], 'boolean deposit' => ['deposit_amount', true], 'unsafe deposit' => ['deposit_amount', 9007199254740992], 'null deposit' => ['deposit_amount', null],
            'zero occupants' => ['occupant_count', 0], 'over capacity' => ['occupant_count', 4], 'fractional occupants' => ['occupant_count', 1.5], 'boolean occupants' => ['occupant_count', true],
            'array note' => ['note', []], 'boolean note' => ['note', false], 'oversize utf8 note' => ['note', str_repeat('ế', 21846)],
        ];
    }

    #[DataProvider('invalidFields')]
    public function test_invalid_input_is_422_without_partially_creating_a_contract(string $field, mixed $value): void
    {
        $this->signIn();
        $input = array_replace($this->input(), [$field => $value]);
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        $response = $this->spa('POST', '/api/v1/contracts', $input)->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertSame($before, $this->snapshot(array_keys($before)));
    }

    public function test_every_required_field_must_be_provided_on_create(): void
    {
        $this->signIn();
        $input = $this->input();
        foreach (['room_id', 'user_id', 'start_date', 'end_date', 'monthly_rent', 'deposit_amount', 'occupant_count'] as $field) {
            $data = $input;
            unset($data[$field]);
            $this->spa('POST', '/api/v1/contracts', $data)->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertDatabaseCount('contracts', 0);
    }

    public function test_protected_fields_even_null_cannot_be_mixed_into_creating_or_updating_drafts(): void
    {
        $this->signIn();
        $draft = Contract::factory()->create();
        $input = $this->input();
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        foreach (['id', 'status', 'contract_number', 'activated_at', 'actual_end_date', 'initial_electricity_reading', 'initial_water_reading', 'meter_gap_reason', 'meter_gap_confirmed_by', 'deposit_status', 'deposit_paid_at', 'deposit_deducted_amount', 'deposit_refund_amount', 'deposit_settled_at', 'renewed_from_id', 'closure_reason', 'closure_note', 'closed_at', 'deleted_at', 'created_at', 'updated_at', 'active_room_id', 'active_tenant_id', 'role', 'services', 'contract_services', 'occupants', 'attachments', 'user'] as $field) {
            $this->spa('POST', '/api/v1/contracts', $input + [$field => null])->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->spa('PATCH', '/api/v1/contracts/'.$draft->id, ['note' => 'Không được lưu', $field => null])->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertSame($before, $this->snapshot(array_keys($before)));
    }

    public static function unsuitableTenants(): array
    {
        return ['admin' => [UserRole::Admin, UserStatus::Active], 'technician' => [UserRole::Technician, UserStatus::Active], 'guard' => [UserRole::Guard, UserStatus::Active], 'locked user' => [UserRole::User, UserStatus::Locked], 'locked resident' => [UserRole::Resident, UserStatus::Locked]];
    }

    #[DataProvider('unsuitableTenants')]
    public function test_draft_rejects_staff_admin_and_locked_tenants(UserRole $role, UserStatus $status): void
    {
        $this->signIn();
        $tenant = User::factory()->role($role)->create(['status' => $status]);
        $this->spa('POST', '/api/v1/contracts', $this->input(tenant: $tenant))->assertUnprocessable()->assertJsonValidationErrors('user_id');
        $this->assertDatabaseCount('contracts', 0);
    }

    public function test_resident_without_active_contract_can_be_selected_without_role_change(): void
    {
        $this->signIn();
        $tenant = User::factory()->role(UserRole::Resident)->create();
        $before = $tenant->fresh()->getRawOriginal();
        $this->spa('POST', '/api/v1/contracts', $this->input(tenant: $tenant))->assertCreated()->assertJsonPath('data.tenant.role', 'resident');
        $this->assertSame($before, $tenant->fresh()->getRawOriginal());
    }

    public static function unavailableRooms(): array
    {
        return [[RoomStatus::Occupied], [RoomStatus::Maintenance], [RoomStatus::Inactive]];
    }

    #[DataProvider('unavailableRooms')]
    public function test_draft_requires_an_available_room(RoomStatus $status): void
    {
        $this->signIn();
        $room = Room::factory()->create(['status' => $status]);
        $this->spa('POST', '/api/v1/contracts', $this->input($room))->assertConflict();
        $this->assertDatabaseCount('contracts', 0);
        $this->assertSame($status, $room->fresh()->status);
    }

    public function test_tenant_with_active_contract_is_rejected_and_existing_contract_is_unchanged(): void
    {
        $this->signIn();
        $tenant = User::factory()->role(UserRole::Resident)->create();
        $active = Contract::factory()->active()->create(['user_id' => $tenant->id]);
        $input = $this->input(tenant: $tenant);
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        $this->spa('POST', '/api/v1/contracts', $input)->assertConflict();
        $this->assertSame($before, $this->snapshot(array_keys($before)));
        $this->assertTrue($active->fresh()->isActive());
    }

    public function test_available_status_does_not_override_an_existing_active_contract_on_the_room(): void
    {
        $this->signIn();
        $room = Room::factory()->create(['status' => RoomStatus::Available]);
        Contract::factory()->active()->create(['room_id' => $room->id]);
        $input = $this->input($room);
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        $this->spa('POST', '/api/v1/contracts', $input)->assertConflict();
        $this->assertSame($before, $this->snapshot(array_keys($before)));
    }

    public function test_patch_merges_dates_and_capacity_with_the_stored_draft_before_validating(): void
    {
        $this->signIn();
        $room = Room::factory()->create(['max_occupants' => 3]);
        $draft = Contract::factory()->create($this->input($room));
        $before = $draft->fresh()->getRawOriginal();
        $url = '/api/v1/contracts/'.$draft->id;
        $this->spa('PATCH', $url, ['start_date' => '2027-10-01'])->assertUnprocessable()->assertJsonValidationErrors('end_date');
        $small = Room::factory()->create(['max_occupants' => 1]);
        $this->spa('PATCH', $url, ['room_id' => $small->id])->assertUnprocessable()->assertJsonValidationErrors('occupant_count');
        $this->assertSame($before, $draft->fresh()->getRawOriginal());
        $this->spa('PATCH', $url, ['room_id' => $small->id, 'occupant_count' => 1])->assertOk()->assertJsonPath('data.room_id', $small->id)->assertJsonPath('data.occupant_count', 1);
        $this->spa('PATCH', $url, ['note' => null])->assertOk()->assertJsonPath('data.note', null);
        $this->assertSame($before['user_id'], $draft->fresh()->user_id);
        $this->assertSame($before['monthly_rent'], $draft->fresh()->monthly_rent);
    }

    public function test_patch_rechecks_changed_tenant_eligibility_without_mutating_the_draft(): void
    {
        $this->signIn();
        $draft = Contract::factory()->create();
        $locked = User::factory()->create(['status' => UserStatus::Locked]);
        $renting = User::factory()->role(UserRole::Resident)->create();
        Contract::factory()->active()->create(['user_id' => $renting->id]);
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        $this->spa('PATCH', '/api/v1/contracts/'.$draft->id, ['user_id' => $locked->id])->assertUnprocessable()->assertJsonValidationErrors('user_id');
        $this->spa('PATCH', '/api/v1/contracts/'.$draft->id, ['user_id' => $renting->id])->assertConflict();
        $this->assertSame($before, $this->snapshot(array_keys($before)));
    }

    public function test_stale_parent_snapshot_cannot_overwrite_or_delete_a_concurrently_changed_draft(): void
    {
        $this->signIn();
        $stale = Contract::factory()->create();
        $replacementRoom = Room::factory()->create();
        $replacementTenant = User::factory()->create();
        DB::table('contracts')->where('id', $stale->id)->update(['room_id' => $replacementRoom->id, 'user_id' => $replacementTenant->id]);
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        $service = app(ContractService::class);
        foreach (['update', 'delete'] as $operation) {
            try {
                if ($operation === 'update') {
                    $service->update($stale, ['note' => 'Không ghi đè thay đổi đồng thời']);
                } else {
                    $service->delete($stale);
                }
                $this->fail('Ảnh chụp khóa ngoại cũ phải bị từ chối.');
            } catch (HttpException $exception) {
                $this->assertSame(409, $exception->getStatusCode());
            }
            $this->assertSame($before, $this->snapshot(array_keys($before)));
        }
    }

    public static function readonlyStatuses(): array
    {
        return [[ContractStatus::Active], [ContractStatus::Terminated], [ContractStatus::Expired]];
    }

    #[DataProvider('readonlyStatuses')]
    public function test_non_draft_contracts_are_readable_but_cannot_be_edited_or_deleted(ContractStatus $status): void
    {
        $this->signIn();
        $contract = Contract::factory()->create(['status' => $status]);
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        $url = '/api/v1/contracts/'.$contract->id;
        $this->spa('GET', $url)->assertOk()->assertJsonPath('data.status', $status->value);
        $this->spa('PATCH', $url, ['note' => 'Không được sửa'])->assertConflict();
        $this->spa('DELETE', $url)->assertConflict();
        $this->assertSame($before, $this->snapshot(array_keys($before)));
    }

    public function test_delete_is_soft_only_and_deleted_draft_is_excluded_from_every_read_or_mutation(): void
    {
        $this->signIn();
        $draft = Contract::factory()->create();
        $before = $this->snapshot(['rooms', 'users', 'invoices', 'payments']);
        $url = '/api/v1/contracts/'.$draft->id;
        $this->spa('DELETE', $url)->assertNoContent();
        $this->assertSoftDeleted('contracts', ['id' => $draft->id]);
        $this->assertSame(1, DB::table('contracts')->where('id', $draft->id)->count());
        $this->spa('GET', '/api/v1/contracts')->assertOk()->assertJsonCount(0, 'data');
        foreach (['GET', 'PATCH', 'DELETE'] as $method) {
            $this->spa($method, $url, ['note' => 'Không sửa nháp đã xóa'])->assertNotFound();
        }
        $this->assertSame($before, $this->snapshot(array_keys($before)));
    }

    public static function children(): array
    {
        return [['occupant'], ['service'], ['invoice'], ['meter_reading'], ['renewal']];
    }

    #[DataProvider('children')]
    public function test_draft_with_linked_children_cannot_be_deleted(string $kind): void
    {
        $this->signIn();
        $draft = Contract::factory()->create();
        if ($kind === 'occupant') {
            DB::table('contract_occupants')->insert(['contract_id' => $draft->id, 'full_name' => 'Người ở cùng']);
        } elseif ($kind === 'service') {
            $service = Service::factory()->create();
            DB::table('contract_services')->insert(['contract_id' => $draft->id, 'service_id' => $service->id, 'quantity' => '1.00', 'unit_price' => 10000, 'start_date' => '2026-10-01']);
        } elseif ($kind === 'invoice') {
            Invoice::factory()->create(['contract_id' => $draft->id]);
        } elseif ($kind === 'meter_reading') {
            MeterReading::factory()->create(['contract_id' => $draft->id, 'room_id' => $draft->room_id]);
        } else {
            Contract::factory()->create(['renewed_from_id' => $draft->id]);
        }
        $before = $this->snapshot(['contracts', 'contract_occupants', 'contract_services', 'invoices', 'meter_readings', 'rooms', 'users']);
        $this->spa('DELETE', '/api/v1/contracts/'.$draft->id)->assertConflict();
        $this->assertSame($before, $this->snapshot(array_keys($before)));
        $this->assertNotSoftDeleted('contracts', ['id' => $draft->id]);
    }

    public function test_listing_is_paginated_in_id_order_and_all_filters_are_combined(): void
    {
        $this->signIn();
        $building = Building::factory()->create();
        $room = Room::factory()->create(['building_id' => $building->id]);
        $tenant = User::factory()->create(['full_name' => 'Người thuê cần tìm']);
        $drafts = Contract::factory()->count(21)->create(['room_id' => $room->id, 'user_id' => $tenant->id]);
        Contract::factory()->terminated()->create();
        $filter = ['status' => 'draft', 'building_id' => $building->id, 'room_id' => $room->id, 'user_id' => $tenant->id, 'q' => 'Người thuê cần tìm'];
        $response = $this->spa('GET', '/api/v1/contracts?'.http_build_query($filter))->assertOk()->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.total', 21)->assertJsonPath('meta.per_page', 20)->assertJsonStructure(['links', 'meta']);
        $this->assertSame($drafts->take(20)->pluck('id')->all(), array_column($response->json('data'), 'id'));
        $this->spa('GET', '/api/v1/contracts?'.http_build_query($filter + ['page' => 2]))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $drafts->last()->id);
        $this->spa('GET', '/api/v1/contracts?'.http_build_query(array_replace($filter, ['status' => 'terminated'])))->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/contracts')->assertOk()->assertJsonPath('meta.total', 22);
    }

    public static function literalSearch(): array
    {
        return [['%'], ['_'], ['\\']];
    }

    #[DataProvider('literalSearch')]
    public function test_search_treats_wildcard_and_escape_characters_literally(string $needle): void
    {
        $this->signIn();
        $tenant = User::factory()->create(['full_name' => 'Tên '.$needle.' cần tìm']);
        $wanted = Contract::factory()->create(['user_id' => $tenant->id]);
        Contract::factory()->create();
        $this->spa('GET', '/api/v1/contracts?'.http_build_query(['q' => $needle]))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $wanted->id);
    }

    public function test_invalid_filters_are_field_errors_without_sql_details(): void
    {
        $this->signIn();
        foreach (['status' => 'bogus', 'building_id' => 'bad', 'room_id' => '-1', 'user_id' => '0', 'page' => '0', 'q' => str_repeat('a', 192)] as $field => $value) {
            $response = $this->spa('GET', '/api/v1/contracts?'.http_build_query([$field => $value]))->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        }
    }

    public function test_csrf_missing_target_numeric_routes_and_missing_group_two_schema(): void
    {
        $this->signIn();
        $draft = Contract::factory()->create();
        $input = $this->input();
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        foreach (['GET', 'PATCH', 'DELETE'] as $method) {
            $this->spa($method, '/api/v1/contracts/999999999', ['note' => 'Mới'])->assertNotFound();
            $this->spa($method, '/api/v1/contracts/not-numeric', ['note' => 'Mới'])->assertNotFound();
        }
        foreach (['POST', 'PATCH', 'DELETE'] as $method) {
            $this->spa($method, '/api/v1/contracts'.($method === 'POST' ? '' : '/'.$draft->id), $input, sendCsrf: false)->assertStatus(419);
        }
        Schema::shouldReceive('hasTable')->andReturnUsing(fn ($table) => $table !== 'contracts');
        foreach (self::endpoints() as [$method, $suffix]) {
            $this->spa($method, '/api/v1/contracts'.($suffix === '' ? '' : sprintf($suffix, $draft->id)), $input)->assertStatus(503);
        }
        $this->assertSame($before, $this->snapshot(array_keys($before)));
        foreach (['index', 'show', 'store', 'update', 'destroy'] as $action) {
            $route = Route::getRoutes()->getByName('api.v1.contracts.'.$action);
            $this->assertNotNull($route);
            foreach (['auth:sanctum', 'active', 'role:admin'] as $middleware) {
                $this->assertContains($middleware, $route->gatherMiddleware());
            }
            if (in_array($action, ['store', 'update', 'destroy'], true)) {
                $this->assertContains('spa', $route->gatherMiddleware());
            }
        }
    }

    public function test_database_failure_rolls_back_and_does_not_expose_or_log_sql_bindings(): void
    {
        $this->signIn();
        $input = $this->input();
        $input['note'] = 'Ghi chú riêng không được log';
        $before = $this->snapshot(['contracts', 'rooms', 'users']);
        Exceptions::fake();
        Event::listen('eloquent.creating: '.Contract::class, function (Contract $contract): void {
            $contract->monthly_rent = null;
        });
        $response = $this->spa('POST', '/api/v1/contracts', $input)->assertStatus(500);
        Exceptions::assertReportedCount(1);
        Exceptions::assertReported(RuntimeException::class);
        Exceptions::assertNotReported(QueryException::class);
        $reported = Exceptions::reported()[0];
        $this->assertNull($reported->getPrevious());
        foreach (['SQLSTATE', $input['note'], 'insert into', self::PASSWORD] as $sensitive) {
            $this->assertStringNotContainsString($sensitive, $response->getContent());
            $this->assertStringNotContainsString($sensitive, (string) $reported);
        }
        $this->assertSame($before, $this->snapshot(array_keys($before)));
    }

    public function test_group_three_absence_does_not_block_independent_draft_crud(): void
    {
        $this->signIn();
        $input = $this->input();
        Schema::shouldReceive('hasTable')->andReturnUsing(fn ($table) => ! in_array($table, ['invoices', 'invoice_items', 'payments', 'meter_readings'], true));
        $id = $this->spa('POST', '/api/v1/contracts', $input)->assertCreated()->json('data.id');
        $this->spa('GET', '/api/v1/contracts')->assertOk()->assertJsonPath('data.0.id', $id);
        $this->spa('GET', '/api/v1/contracts/'.$id)->assertOk();
        $this->spa('PATCH', '/api/v1/contracts/'.$id, ['note' => 'Nháp độc lập Nhóm 3'])->assertOk();
        $this->spa('DELETE', '/api/v1/contracts/'.$id)->assertNoContent();
        $this->assertSoftDeleted('contracts', ['id' => $id]);
    }
}
