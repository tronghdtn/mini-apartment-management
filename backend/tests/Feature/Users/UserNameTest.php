<?php

namespace Tests\Feature\Users;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class UserNameTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Name Test Private!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => 'Name Test Private!42'])->assertOk();

        return $user;
    }

    private function url(User $user): string
    {
        return '/api/v1/users/'.$user->id;
    }

    public static function targets(): array
    {
        $cases = [];
        foreach (UserRole::cases() as $role) {
            foreach (UserStatus::cases() as $status) {
                $cases[$role->value.' '.$status->value] = [$role, $status];
            }
        }

        return $cases;
    }

    #[DataProvider('targets')]
    public function test_admin_updates_only_name_for_each_role_and_status(UserRole $role, UserStatus $status): void
    {
        $admin = $this->signIn();
        $target = User::factory()->role($role)->create(['status' => $status]);
        $before = $target->fresh()->getRawOriginal();
        $adminBefore = $admin->fresh()->getRawOriginal();
        $session = $this->sessionId();
        $response = $this->spa('PATCH', $this->url($target), ['full_name' => '  Nguyễn Văn Bình  '])->assertOk()
            ->assertJsonPath('data.full_name', 'Nguyễn Văn Bình')->assertJsonPath('data.role', $role->value)->assertJsonPath('data.status', $status->value);
        $after = $target->fresh()->getRawOriginal();
        foreach ($before as $key => $value) {
            if (! in_array($key, ['full_name', 'updated_at'], true)) {
                $this->assertSame($value, $after[$key], $key.' phải giữ nguyên');
            }
        }
        $this->assertSame($adminBefore, $admin->fresh()->getRawOriginal());
        $this->assertSame($session, $this->sessionId());
        foreach (['password', 'remember_token', 'email_verified_at', 'id_number', 'date_of_birth', 'gender', 'permanent_address'] as $field) {
            $this->assertArrayNotHasKey($field, $response->json('data'));
        }
    }

    public static function callers(): array
    {
        return array_map(fn ($role) => [$role], ['anonymous', 'user', 'resident', 'technician', 'guard', 'locked_admin']);
    }

    #[DataProvider('callers')]
    public function test_unprivileged_and_locked_callers_cannot_edit_any_name(string $role): void
    {
        if ($role !== 'anonymous') {
            $actor = $this->signIn($role === 'locked_admin' ? UserRole::Admin : UserRole::from($role));
            if ($role === 'locked_admin') {
                $actor->status = UserStatus::Locked;
                $actor->save();
            }
        }
        $target = User::factory()->create();
        $before = $target->fresh()->getRawOriginal();
        $this->spa('PATCH', $this->url($target), ['full_name' => 'Tên không được lưu'])->assertStatus($role === 'anonymous' ? 401 : 403);
        $this->assertSame($before, $target->fresh()->getRawOriginal());
    }

    public static function invalidNames(): array
    {
        $cases = [[[], 'full_name']];
        foreach ([null, '', '   ', [], true, str_repeat('a', 121)] as $name) {
            $cases[] = [['full_name' => $name], 'full_name'];
        }
        foreach (['id', 'user_id', 'status', 'phone', 'email', 'password', 'password_confirmation', 'role', 'email_verified_at', 'remember_token', 'id_number', 'date_of_birth', 'gender', 'permanent_address', 'has_active_contract', 'active_contract', 'created_at', 'updated_at', 'permissions', 'is_admin'] as $field) {
            $cases[] = [['full_name' => 'Tên hợp lệ', $field => null], $field];
        }

        return $cases;
    }

    #[DataProvider('invalidNames')]
    public function test_invalid_or_protected_fields_are_rejected_without_partial_update(array $input, string $field): void
    {
        $this->signIn();
        $target = User::factory()->create();
        $before = DB::table('users')->orderBy('id')->get()->toJson();
        $this->spa('PATCH', $this->url($target), $input)->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
    }

    public function test_admin_own_name_refreshes_me_without_session_or_login_identifier_change(): void
    {
        $admin = $this->signIn();
        $session = $this->sessionId();
        $this->spa('PATCH', $this->url($admin), ['full_name' => 'Admin Tên Mới'])->assertOk();
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.full_name', 'Admin Tên Mới')->assertJsonPath('data.email', $admin->email)->assertJsonPath('data.role', 'admin');
        $this->assertSame($session, $this->sessionId());
        $this->spa('PATCH', $this->url($admin).'/status', ['status' => 'locked'])->assertForbidden();
    }

    public function test_names_can_be_duplicated_accept_the_length_boundary_and_noop_does_not_touch_timestamp(): void
    {
        $this->signIn();
        $name = str_repeat('a', 120);
        User::factory()->create(['full_name' => $name]);
        $target = User::factory()->create();
        $this->spa('PATCH', $this->url($target), ['full_name' => $name])->assertOk()->assertJsonPath('data.full_name', $name);
        $before = $target->fresh()->getRawOriginal();
        $this->travel(2)->seconds();
        $this->spa('PATCH', $this->url($target), ['full_name' => $name])->assertOk();
        $this->assertSame($before, $target->fresh()->getRawOriginal());
        $this->assertSame(2, User::where('full_name', $name)->count());
    }

    public function test_contract_invoice_payment_and_other_accounts_are_unchanged(): void
    {
        $admin = $this->signIn();
        $target = User::factory()->role(UserRole::Resident)->create();
        $contract = Contract::factory()->active()->create(['user_id' => $target->id]);
        $invoice = Invoice::factory()->issued()->create(['contract_id' => $contract->id]);
        DB::table('payments')->insert(['invoice_id' => $invoice->id, 'amount' => 1000, 'method' => 'bank_transfer', 'status' => 'confirmed', 'submitted_by' => $target->id, 'reviewed_by' => $admin->id]);
        $tables = ['contracts', 'rooms', 'buildings', 'invoices', 'invoice_items', 'payments'];
        $snapshots = [];
        foreach ($tables as $table) {
            $snapshots[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }
        $this->spa('PATCH', $this->url($target), ['full_name' => 'Tên hiển thị mới'])->assertOk()->assertJsonPath('data.has_active_contract', true);
        foreach ($tables as $table) {
            $this->assertSame($snapshots[$table], DB::table($table)->orderBy('id')->get()->toJson());
        }
    }

    public function test_missing_target_csrf_missing_schema_and_route_contract(): void
    {
        $this->signIn();
        $target = User::factory()->create();
        $before = $target->fresh()->getRawOriginal();
        $this->spa('PATCH', '/api/v1/users/999999999', ['full_name' => 'Tên mới'])->assertNotFound();
        $this->spa('PATCH', $this->url($target), ['full_name' => 'Tên mới'], sendCsrf: false)->assertStatus(419);
        Schema::shouldReceive('hasTable')->andReturnUsing(fn ($table) => $table !== 'contracts');
        $this->spa('PATCH', $this->url($target), ['full_name' => 'Tên mới'])->assertStatus(503);
        $this->assertSame($before, $target->fresh()->getRawOriginal());
        $route = Route::getRoutes()->getByName('api.v1.users.updateName');
        $this->assertSame('api/v1/users/{user}', $route->uri());
        foreach (['auth:sanctum', 'active', 'role:admin', 'spa'] as $middleware) {
            $this->assertContains($middleware, $route->gatherMiddleware());
        }
    }

    public function test_sql_error_rolls_back_and_does_not_report_original_query_or_name(): void
    {
        $this->signIn();
        $target = User::factory()->create();
        $before = $target->fresh()->getRawOriginal();
        Exceptions::fake();
        Event::listen('eloquent.updating: '.User::class, function (User $user): void {
            $user->full_name = null;
        });
        $response = $this->spa('PATCH', $this->url($target), ['full_name' => 'Tên riêng không được log'])->assertStatus(500);
        Exceptions::assertReportedCount(1);
        Exceptions::assertReported(RuntimeException::class);
        Exceptions::assertNotReported(QueryException::class);
        $this->assertNull(Exceptions::reported()[0]->getPrevious());
        foreach (['SQLSTATE', 'Tên riêng không được log', $target->phone] as $sensitive) {
            $this->assertStringNotContainsString($sensitive, $response->getContent());
            $this->assertStringNotContainsString($sensitive, (string) Exceptions::reported()[0]);
        }
        $this->assertSame($before, $target->fresh()->getRawOriginal());
    }
}
