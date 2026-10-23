<?php

namespace Tests\Feature\Users;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class AdminUserReadTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const LIST_FIELDS = ['id', 'full_name', 'email', 'phone', 'role', 'status', 'created_at', 'has_active_contract', 'active_contract'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['full_name' => 'Quản trị kiểm thử USR', 'email' => 'admin-read@example.test', 'password' => 'User Read Test!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => 'User Read Test!42'])->assertOk();

        return $user;
    }

    /** @return array<string,array{string,string}> */
    public static function restrictedEndpoints(): array
    {
        $cases = [];
        foreach (['anonymous', 'user', 'resident', 'technician', 'guard', 'locked'] as $role) {
            foreach (['list' => '', 'detail' => '/999999999'] as $label => $suffix) {
                $cases[$role.' '.$label] = [$role, $suffix];
            }
        }

        return $cases;
    }

    #[DataProvider('restrictedEndpoints')]
    public function test_both_endpoints_check_session_role_and_current_status_before_reading_data(string $role, string $suffix): void
    {
        if ($role !== 'anonymous') {
            $user = $this->signIn($role === 'locked' ? UserRole::Admin : UserRole::from($role));
            if ($role === 'locked') {
                $user->status = UserStatus::Locked;
                $user->save();
            }
        }
        $this->spa('GET', '/api/v1/users'.$suffix)->assertStatus($role === 'anonymous' ? 401 : 403);
    }

    public function test_admin_list_paginates_twenty_users_in_id_order_without_role_default_filter(): void
    {
        $admin = $this->signIn();
        $users = User::factory()->count(20)->create();
        $first = $this->spa('GET', '/api/v1/users')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 21)
            ->assertJsonPath('meta.per_page', 20)->assertJsonStructure(['data', 'links', 'meta']);
        $this->assertSame([$admin->id, ...$users->take(19)->pluck('id')->all()], array_column($first->json('data'), 'id'));
        $this->spa('GET', '/api/v1/users?page=2')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $users->last()->id)->assertJsonPath('meta.current_page', 2);
        foreach ($first->json('data') as $row) {
            $this->assertEqualsCanonicalizing(self::LIST_FIELDS, array_keys($row));
        }
    }

    public function test_nullable_email_and_empty_filtered_result_are_reported_without_fallback(): void
    {
        $this->signIn();
        $user = User::factory()->create(['email' => null, 'created_at' => '2026-10-23 01:02:03']);
        $response = $this->spa('GET', '/api/v1/users?q='.urlencode($user->phone))->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', null)->assertJsonPath('data.0.has_active_contract', false)->assertJsonPath('data.0.active_contract', null);
        $this->assertMatchesRegularExpression('/^2026-10-23T01:02:03(?:\.0+)?Z$/', $response->json('data.0.created_at'));
        $this->spa('GET', '/api/v1/users?q=ABSENT-UNIQUE-TERM-99119')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
    }

    public function test_active_contract_uses_real_room_and_building_relationships(): void
    {
        $this->signIn();
        $resident = User::factory()->role(UserRole::Resident)->create();
        $building = Building::factory()->create(['name' => 'Tòa thật từ quan hệ']);
        $room = Room::factory()->create(['building_id' => $building->id, 'code' => 'ACTUAL-201']);
        $contract = Contract::factory()->active()->create(['user_id' => $resident->id, 'room_id' => $room->id]);
        $expected = ['id' => $contract->id, 'room' => ['id' => $room->id, 'code' => 'ACTUAL-201', 'building' => ['id' => $building->id, 'name' => 'Tòa thật từ quan hệ']]];
        $this->spa('GET', '/api/v1/users?has_active_contract=1')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $resident->id)->assertJsonPath('data.0.has_active_contract', true)->assertJsonPath('data.0.active_contract', $expected);
        $this->spa('GET', '/api/v1/users/'.$resident->id)->assertOk()->assertJsonPath('data.has_active_contract', true)->assertJsonPath('data.active_contract', $expected);
    }

    public function test_resident_role_alone_and_draft_terminated_or_soft_deleted_contracts_are_not_active_tenancy(): void
    {
        $admin = $this->signIn();
        $residents = User::factory()->role(UserRole::Resident)->count(4)->create();
        Contract::factory()->terminated()->create(['user_id' => $residents[1]->id]);
        Contract::factory()->create(['user_id' => $residents[2]->id]);
        // Dữ liệu lịch sử bất thường vẫn phải bị global scope SoftDeletes loại khỏi kết quả.
        Contract::factory()->active()->create(['user_id' => $residents[3]->id, 'deleted_at' => now()]);
        $response = $this->spa('GET', '/api/v1/users?role=resident&has_active_contract=0')->assertOk()->assertJsonCount(4, 'data');
        $this->assertSame($residents->pluck('id')->all(), array_column($response->json('data'), 'id'));
        foreach ($response->json('data') as $row) {
            $this->assertFalse($row['has_active_contract']);
            $this->assertNull($row['active_contract']);
        }
        $this->spa('GET', '/api/v1/users?has_active_contract=1')->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/users/'.$residents[1]->id)->assertOk()->assertJsonPath('data.role', 'resident')->assertJsonPath('data.has_active_contract', false);
        $this->assertSame(UserRole::Admin, $admin->fresh()->role);
    }

    public function test_filters_combine_with_and_and_search_fields_are_a_grouped_or(): void
    {
        $this->signIn();
        $wanted = User::factory()->role(UserRole::Resident)->locked()->create(['full_name' => 'Tên không có từ cần tìm', 'email' => 'needle-target@example.test']);
        User::factory()->role(UserRole::Resident)->create(['full_name' => 'needle active status', 'email' => null]);
        User::factory()->role(UserRole::Guard)->locked()->create(['full_name' => 'needle wrong role', 'email' => null]);
        $active = User::factory()->role(UserRole::Resident)->locked()->create(['full_name' => 'needle active contract', 'email' => null]);
        Contract::factory()->active()->create(['user_id' => $active->id]);
        $response = $this->spa('GET', '/api/v1/users?'.http_build_query(['role' => 'resident', 'status' => 'locked', 'has_active_contract' => '0', 'q' => ' needle ']))
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $wanted->id);
        $this->assertSame(1, $response->json('meta.total'));
    }

    /** @return array<string,array{string}> */
    public static function literalSearch(): array
    {
        return ['percent' => ['%'], 'underscore' => ['_'], 'backslash' => ['\\']];
    }

    #[DataProvider('literalSearch')]
    public function test_search_treats_sql_wildcard_and_escape_characters_literally(string $needle): void
    {
        $this->signIn();
        $wanted = User::factory()->create(['full_name' => 'Ký tự '.$needle.' cần tìm', 'email' => null]);
        User::factory()->create(['full_name' => 'Ký tự khác cần tìm', 'email' => null]);
        $this->spa('GET', '/api/v1/users?'.http_build_query(['q' => $needle]))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $wanted->id);
    }

    /** @return array<string,array{string}> */
    public static function searchableFields(): array
    {
        return ['display name' => ['Tên độc đáo'], 'email' => ['needle-address'], 'phone' => ['0901234567']];
    }

    #[DataProvider('searchableFields')]
    public function test_search_matches_name_email_or_phone(string $needle): void
    {
        $this->signIn();
        $wanted = User::factory()->create(['full_name' => 'Tên độc đáo của khách', 'email' => 'needle-address@example.test', 'phone' => '0901234567']);
        $this->spa('GET', '/api/v1/users?'.http_build_query(['q' => $needle]))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $wanted->id);
    }

    /** @return array<string,array{array,string}> */
    public static function invalidFilters(): array
    {
        return [
            'unknown role' => [['role' => 'owner'], 'role'], 'role array' => [['role' => ['admin']], 'role'],
            'unknown status' => [['status' => 'disabled'], 'status'], 'status array' => [['status' => ['active']], 'status'],
            'active contract two' => [['has_active_contract' => '2'], 'has_active_contract'],
            'active contract word' => [['has_active_contract' => 'true'], 'has_active_contract'],
            'active contract array' => [['has_active_contract' => ['1']], 'has_active_contract'],
            'long search' => [['q' => str_repeat('a', 192)], 'q'], 'search array' => [['q' => ['text']], 'q'],
            'page zero' => [['page' => 0], 'page'], 'page negative' => [['page' => -1], 'page'],
            'fraction page' => [['page' => 1.5], 'page'], 'overflow page' => [['page' => '2147483648'], 'page'],
        ];
    }

    #[DataProvider('invalidFilters')]
    public function test_invalid_filters_return_json_field_errors(array $filters, string $field): void
    {
        $this->signIn();
        $this->spa('GET', '/api/v1/users?'.http_build_query($filters))->assertUnprocessable()->assertJsonValidationErrors($field);
    }

    public function test_maximum_valid_page_and_search_length_are_accepted_and_only_validated_filters_reach_links(): void
    {
        $this->signIn();
        $this->spa('GET', '/api/v1/users?page=2147483647')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.current_page', 2147483647);
        $this->spa('GET', '/api/v1/users?q='.str_repeat('a', 191))->assertOk()->assertJsonCount(0, 'data');
        User::factory()->count(20)->create();
        $response = $this->spa('GET', '/api/v1/users?unexpected_control=do-not-propagate')->assertOk();
        $this->assertStringNotContainsString('unexpected_control', json_encode($response->json('links'), JSON_THROW_ON_ERROR));
        $this->assertStringNotContainsString('unexpected_control', json_encode($response->json('meta.links'), JSON_THROW_ON_ERROR));
    }

    public function test_admin_detail_alone_exposes_nullable_legal_profile_and_never_secrets(): void
    {
        $admin = $this->signIn();
        $admin->fill(['id_number' => '012345678901', 'date_of_birth' => '1999-12-31', 'gender' => 'legacy', 'permanent_address' => 'Địa chỉ hồ sơ thử nghiệm'])->save();
        $detail = $this->spa('GET', '/api/v1/users/'.$admin->id)->assertOk()->assertJsonPath('data.id_number', '012345678901')
            ->assertJsonPath('data.date_of_birth', '1999-12-31')->assertJsonPath('data.gender', 'legacy')->assertJsonPath('data.permanent_address', 'Địa chỉ hồ sơ thử nghiệm');
        $this->assertEqualsCanonicalizing([...self::LIST_FIELDS, 'id_number', 'date_of_birth', 'gender', 'permanent_address'], array_keys($detail->json('data')));
        $list = $this->spa('GET', '/api/v1/users')->assertOk()->json('data.0');
        $me = $this->spa('GET', '/api/v1/auth/me')->assertOk()->json('data');
        foreach (['id_number', 'date_of_birth', 'gender', 'permanent_address'] as $field) {
            $this->assertArrayNotHasKey($field, $list);
            $this->assertArrayNotHasKey($field, $me);
        }
        foreach ([$detail->json('data'), $list, $me] as $row) {
            foreach (['password', 'remember_token', 'email_verified_at', 'active_tenant_id', 'files', 'payments'] as $field) {
                $this->assertArrayNotHasKey($field, $row);
            }
        }
        $this->assertContains('id_number', $admin->getHidden());
        $other = User::factory()->create(['email' => null]);
        $response = $this->spa('GET', '/api/v1/users/'.$other->id)->assertOk();
        foreach (['id_number', 'date_of_birth', 'gender', 'permanent_address'] as $field) {
            $response->assertJsonPath('data.'.$field, null);
        }
    }

    public function test_reads_do_not_write_accounts_roles_status_or_contract_data_and_unapproved_mutations_are_rejected(): void
    {
        $admin = $this->signIn();
        $resident = User::factory()->role(UserRole::Resident)->create();
        Contract::factory()->active()->create(['user_id' => $resident->id]);
        $beforeUsers = DB::table('users')->orderBy('id')->get()->toJson();
        $beforeContracts = DB::table('contracts')->orderBy('id')->get()->toJson();
        $this->spa('GET', '/api/v1/users')->assertOk();
        $this->spa('GET', '/api/v1/users/'.$resident->id)->assertOk();
        $this->spa('POST', '/api/v1/users', ['role' => 'admin'])->assertUnprocessable()->assertJsonValidationErrors(['full_name', 'phone', 'password', 'role']);
        $this->spa('PATCH', '/api/v1/users/'.$resident->id, ['role' => 'admin', 'status' => 'locked'])->assertUnprocessable()->assertJsonValidationErrors(['full_name', 'role', 'status']);
        foreach (['PUT', 'DELETE'] as $method) {
            $this->spa($method, '/api/v1/users/'.$resident->id, ['role' => 'admin', 'status' => 'locked'])->assertStatus(405);
        }
        $this->assertSame($beforeUsers, DB::table('users')->orderBy('id')->get()->toJson());
        $this->assertSame($beforeContracts, DB::table('contracts')->orderBy('id')->get()->toJson());
        $this->assertSame(UserRole::Admin, $admin->fresh()->role);
    }

    public function test_missing_or_nonnumeric_account_id_is_404(): void
    {
        $this->signIn();
        foreach (['999999999', 'not-an-id', '-1'] as $id) {
            $this->spa('GET', '/api/v1/users/'.$id)->assertNotFound()->assertJsonStructure(['message']);
        }
    }

    /** @return array<string,array{string,string}> */
    public static function unavailableSchema(): array
    {
        $cases = [];
        foreach (['users', 'contracts', 'rooms', 'buildings'] as $table) {
            foreach (['list' => '', 'detail' => '/999999999'] as $label => $suffix) {
                $cases[$table.' '.$label] = [$table, $suffix];
            }
        }

        return $cases;
    }

    #[DataProvider('unavailableSchema')]
    public function test_missing_required_schema_returns_503_instead_of_false_tenancy_or_sql_error(string $missing, string $suffix): void
    {
        $this->signIn();
        Schema::shouldReceive('hasTable')->andReturnUsing(fn (string $table): bool => $table !== $missing);
        $response = $this->spa('GET', '/api/v1/users'.$suffix)->assertStatus(503)->assertJsonStructure(['message']);
        $this->assertArrayNotHasKey('data', $response->json());
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
    }

    public function test_eager_loading_query_count_stays_bounded_when_a_page_contains_twenty_active_residents(): void
    {
        $this->signIn();
        $residents = User::factory()->role(UserRole::Resident)->count(20)->create();
        foreach ($residents as $resident) {
            Contract::factory()->active()->create(['user_id' => $resident->id]);
        }
        DB::enableQueryLog();
        try {
            DB::flushQueryLog();
            $this->spa('GET', '/api/v1/users?role=resident&q='.urlencode($residents[0]->phone))->assertOk()->assertJsonCount(1, 'data');
            $singleCount = count(DB::getQueryLog());
            DB::flushQueryLog();
            $this->spa('GET', '/api/v1/users?role=resident')->assertOk()->assertJsonCount(20, 'data');
            $pageCount = count(DB::getQueryLog());
        } finally {
            DB::disableQueryLog();
            DB::flushQueryLog();
        }
        $this->assertLessThanOrEqual($singleCount + 2, $pageCount, 'Không được tăng query theo từng người trong trang.');
        $this->assertLessThan(20, $pageCount, 'Bao gồm cả session/auth/schema checks, trang20 người vẫn phải dùng số query có giới hạn.');
    }
}
