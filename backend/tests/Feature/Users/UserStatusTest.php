<?php

namespace Tests\Feature\Users;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\User;
use App\Services\AdminUserService;
use Illuminate\Auth\Access\AuthorizationException;
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

class UserStatusTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const PASSWORD = 'Status Test Private!42';

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => self::PASSWORD]);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => self::PASSWORD])->assertOk();

        return $user;
    }

    private function url(User $user): string
    {
        return '/api/v1/users/'.$user->id.'/status';
    }

    public static function targetRoles(): array
    {
        return array_combine(['user', 'resident', 'technician', 'guard'], array_map(fn ($role) => [$role], ['user', 'resident', 'technician', 'guard']));
    }

    #[DataProvider('targetRoles')]
    public function test_locks_unlocks_all_four_roles_without_changing_identity_credentials_or_admin_session(string $role): void
    {
        $admin = $this->signIn();
        $target = User::factory()->role(UserRole::from($role))->create();
        $original = $target->fresh()->getRawOriginal();
        $adminBefore = $admin->fresh()->getRawOriginal();
        $session = $this->sessionId();
        foreach (['locked', 'active'] as $status) {
            $response = $this->spa('PATCH', $this->url($target), ['status' => $status])->assertOk()
                ->assertJsonPath('data.status', $status)->assertJsonPath('data.role', $role)->assertJsonPath('data.id', $target->id);
            foreach (['password', 'remember_token', 'id_number', 'date_of_birth', 'gender', 'permanent_address'] as $field) {
                $this->assertArrayNotHasKey($field, $response->json('data'));
            }
            $after = $target->fresh()->getRawOriginal();
            foreach ($original as $key => $value) {
                if (! in_array($key, ['status', 'updated_at'], true)) {
                    $this->assertSame($value, $after[$key], $key.' không được đổi');
                }
            }
            // Gửi lại cùng trạng thái không ghi timestamp hoặc biến thành toggle.
            $this->travel(2)->seconds();
            $this->spa('PATCH', $this->url($target), ['status' => $status])->assertOk()->assertJsonPath('data.status', $status);
            $this->assertSame($after, $target->fresh()->getRawOriginal());
        }
        $this->assertSame($adminBefore, $admin->fresh()->getRawOriginal());
        $this->assertSame($session, $this->sessionId());
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $admin->id);
    }

    public static function callers(): array
    {
        return array_map(fn ($role) => [$role], ['anonymous', 'user', 'resident', 'technician', 'guard', 'locked_admin']);
    }

    #[DataProvider('callers')]
    public function test_only_active_admin_can_mutate_status(string $role): void
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
        $this->spa('PATCH', $this->url($target), ['status' => 'locked'])->assertStatus($role === 'anonymous' ? 401 : 403);
        $this->assertSame($before, $target->fresh()->getRawOriginal());
    }

    public function test_admin_cannot_change_self_or_any_other_admin_in_either_state(): void
    {
        $actor = $this->signIn();
        $other = User::factory()->role(UserRole::Admin)->create();
        $lockedAdmin = User::factory()->role(UserRole::Admin)->locked()->create();
        $before = DB::table('users')->orderBy('id')->get()->toJson();
        foreach ([$actor, $other, $lockedAdmin] as $target) {
            foreach (['locked', 'active'] as $status) {
                $this->spa('PATCH', $this->url($target), ['status' => $status])->assertForbidden();
            }
        }
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
    }

    public static function invalidInputs(): array
    {
        $cases = array_map(fn ($value) => [['status' => $value], 'status'], [null, '', 'inactive', 'admin', true, 1, ['locked']]);
        $cases[] = [[], 'status'];
        foreach (['id', 'user_id', 'full_name', 'phone', 'email', 'password', 'password_confirmation', 'role', 'email_verified_at', 'remember_token', 'id_number', 'date_of_birth', 'gender', 'permanent_address', 'has_active_contract', 'active_contract', 'created_at', 'updated_at', 'permissions', 'is_admin'] as $field) {
            $cases[] = [['status' => 'locked', $field => null], $field];
        }

        return $cases;
    }

    #[DataProvider('invalidInputs')]
    public function test_invalid_payload_never_changes_any_account(array $body, string $field): void
    {
        $this->signIn();
        $target = User::factory()->create();
        $before = DB::table('users')->orderBy('id')->get()->toJson();
        $this->spa('PATCH', $this->url($target), $body)->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
    }

    #[DataProvider('targetRoles')]
    public function test_existing_cookie_session_is_rejected_after_lock_and_old_password_works_after_unlock(string $role): void
    {
        $target = $this->signIn(UserRole::from($role));
        $targetJar = $this->cookieJar;
        $this->cookieJar = [];
        $this->initializeSpaClient();
        $this->signIn();
        $this->spa('PATCH', $this->url($target), ['status' => 'locked'])->assertOk();
        $adminJar = $this->cookieJar;
        $this->cookieJar = $targetJar;
        $this->spa('GET', '/api/v1/auth/me')->assertForbidden();
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
        foreach ([$target->email, $target->phone] as $identifier) {
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => $identifier, 'password' => self::PASSWORD])->assertForbidden();
        }
        $this->cookieJar = $adminJar;
        $this->spa('PATCH', $this->url($target), ['status' => 'active'])->assertOk();
        $this->cookieJar = $targetJar;
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
        $this->cookieJar = [];
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $target->phone, 'password' => self::PASSWORD])->assertOk()->assertJsonPath('data.role', $role);
    }

    public function test_lock_keeps_contract_room_invoice_and_payment_history_unchanged(): void
    {
        $admin = $this->signIn();
        $target = User::factory()->role(UserRole::Resident)->create();
        $contract = Contract::factory()->active()->create(['user_id' => $target->id]);
        $invoice = Invoice::factory()->issued()->create(['contract_id' => $contract->id]);
        DB::table('payments')->insert(['invoice_id' => $invoice->id, 'amount' => 1000, 'method' => 'bank_transfer', 'status' => 'confirmed', 'submitted_by' => $target->id, 'reviewed_by' => $admin->id]);
        $tables = ['buildings', 'rooms', 'contracts', 'contract_occupants', 'contract_services', 'invoices', 'invoice_items', 'payments'];
        $snapshots = [];
        foreach ($tables as $table) {
            $snapshots[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }
        foreach (['locked', 'active'] as $status) {
            $this->spa('PATCH', $this->url($target), ['status' => $status])->assertOk()->assertJsonPath('data.has_active_contract', true);
            foreach ($tables as $table) {
                $this->assertSame($snapshots[$table], DB::table($table)->orderBy('id')->get()->toJson(), $table);
            }
        }
    }

    public function test_missing_target_invalid_id_csrf_and_route_contract(): void
    {
        $this->signIn();
        $target = User::factory()->create();
        foreach (['999999999', 'not-an-id', '-1'] as $id) {
            $this->spa('PATCH', '/api/v1/users/'.$id.'/status', ['status' => 'locked'])->assertNotFound();
        }
        $this->spa('PATCH', $this->url($target), ['status' => 'locked'], sendCsrf: false)->assertStatus(419);
        $this->spa('PATCH', $this->url($target), ['status' => 'locked'], ['HTTP_X_XSRF_TOKEN' => 'wrong-token'])->assertStatus(419);
        $this->assertSame(UserStatus::Active, $target->fresh()->status);
        $route = Route::getRoutes()->getByName('api.v1.users.status');
        $this->assertSame('api/v1/users/{user}/status', $route->uri());
        foreach (['auth:sanctum', 'active', 'role:admin', 'spa'] as $middleware) {
            $this->assertContains($middleware, $route->gatherMiddleware());
        }
    }

    public function test_missing_schema_does_not_write_or_return_sql_error(): void
    {
        $this->signIn();
        $target = User::factory()->create();
        Schema::shouldReceive('hasTable')->andReturnUsing(fn ($table) => $table !== 'contracts');
        $this->spa('PATCH', $this->url($target), ['status' => 'locked'])->assertStatus(503);
        $this->assertSame(UserStatus::Active, $target->fresh()->status);
    }

    public function test_service_rechecks_current_target_role_under_row_lock_instead_of_trusting_earlier_read(): void
    {
        $admin = $this->signIn();
        $target = User::factory()->create();
        $stale = $target->replicate();
        $target->role = UserRole::Admin;
        $target->save();
        $this->assertSame(UserRole::User, $stale->role);
        $this->expectException(AuthorizationException::class);
        app(AdminUserService::class)->changeStatus($admin, $target->id, UserStatus::Locked);
    }

    public function test_real_query_failure_rolls_back_and_reports_only_sanitized_exception(): void
    {
        $this->signIn();
        $target = User::factory()->create();
        $before = $target->fresh()->getRawOriginal();
        Exceptions::fake();
        Event::listen('eloquent.updating: '.User::class, function (User $user): void {
            $user->status = null; // SQL NOT NULL thật, không giả HTTP response.
        });
        $response = $this->spa('PATCH', $this->url($target), ['status' => 'locked'])->assertStatus(500);
        Exceptions::assertReportedCount(1);
        Exceptions::assertReported(RuntimeException::class);
        Exceptions::assertNotReported(QueryException::class);
        $this->assertNull(Exceptions::reported()[0]->getPrevious());
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertSame($before, $target->fresh()->getRawOriginal());
    }
}
