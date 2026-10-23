<?php

namespace Tests\Feature\Users;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class StaffUserCreateTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const INPUT = ['full_name' => 'Nhân viên thử nghiệm', 'phone' => '0901234567', 'role' => 'technician', 'password' => 'Staff Private Pass!42', 'password_confirmation' => 'Staff Private Pass!42'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Operator Test!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => 'Operator Test!42'])->assertOk();

        return $user;
    }

    public function test_creation_uses_the_admin_resource_route_and_not_the_public_auth_prefix(): void
    {
        $route = Route::getRoutes()->getByName('api.v1.users.store');
        $this->assertNotNull($route);
        $this->assertSame('api/v1/users', $route->uri());
        foreach (['auth:sanctum', 'active', 'role:admin', 'spa'] as $middleware) {
            $this->assertContains($middleware, $route->gatherMiddleware());
        }
        $this->assertNull(Route::getRoutes()->getByName('api.v1.auth.users.store'));
        $this->signIn();
        $this->spa('POST', '/api/v1/auth/users', self::INPUT)->assertNotFound();
        $this->assertDatabaseCount('users', 1);
    }

    /** @return array<string,array{string,array}> */
    public static function staffEmails(): array
    {
        $cases = [];
        foreach (['technician', 'guard'] as $role) {
            foreach (['present' => ['email' => '  STAFF@Example.test '], 'absent' => [], 'null' => ['email' => null], 'blank' => ['email' => '   ']] as $label => $email) {
                $cases[$role.' '.$label] = [$role, $email];
            }
        }

        return $cases;
    }

    #[DataProvider('staffEmails')]
    public function test_creates_only_active_staff_with_optional_email_and_preserves_admin_session(string $role, array $email): void
    {
        $admin = $this->signIn();
        $before = $admin->fresh()->getRawOriginal();
        $session = $this->sessionId();
        $response = $this->spa('POST', '/api/v1/users', array_replace(self::INPUT, ['role' => $role], $email))
            ->assertCreated()->assertJsonPath('data.role', $role)->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.has_active_contract', false)->assertJsonPath('data.active_contract', null);
        $staff = User::findOrFail($response->json('data.id'));
        $this->assertSame(trim($email['email'] ?? '') === '' ? null : 'staff@example.test', $staff->email);
        $this->assertNull($staff->email_verified_at);
        $this->assertNull($staff->remember_token);
        $this->assertTrue(Hash::check(self::INPUT['password'], $staff->password));
        $this->assertNotSame(self::INPUT['password'], $staff->password);
        $this->assertSame($session, $this->sessionId());
        $this->assertSame($before, $admin->fresh()->getRawOriginal());
        $this->assertEqualsCanonicalizing(['id', 'full_name', 'email', 'phone', 'role', 'status', 'created_at', 'has_active_contract', 'active_contract'], array_keys($response->json('data')));
        foreach (['password', 'password_confirmation', 'remember_token', 'email_verified_at', 'id_number', 'date_of_birth', 'gender', 'permanent_address'] as $field) {
            $this->assertArrayNotHasKey($field, $response->json('data'));
        }
        $this->assertStringNotContainsString(self::INPUT['password'], $response->getContent());
        $this->assertStringNotContainsString($staff->password, $response->getContent());
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $admin->id)->assertJsonPath('data.role', 'admin');
        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseCount('contracts', 0);
    }

    public function test_multiple_staff_accounts_without_email_are_allowed(): void
    {
        $this->signIn();
        $this->spa('POST', '/api/v1/users', self::INPUT)->assertCreated();
        $this->spa('POST', '/api/v1/users', array_replace(self::INPUT, ['phone' => '0901234568', 'role' => 'guard']))->assertCreated();
        $this->assertSame(2, User::whereNull('email')->count());
    }

    /** @return array<string,array{string}> */
    public static function restrictedRoles(): array
    {
        return ['anonymous' => ['anonymous'], 'user' => ['user'], 'resident' => ['resident'], 'technician' => ['technician'], 'guard' => ['guard'], 'locked' => ['locked']];
    }

    #[DataProvider('restrictedRoles')]
    public function test_creation_requires_an_active_admin_and_never_adds_a_user_for_other_accounts(string $role): void
    {
        if ($role !== 'anonymous') {
            $user = $this->signIn($role === 'locked' ? UserRole::Admin : UserRole::from($role));
            if ($role === 'locked') {
                $user->status = UserStatus::Locked;
                $user->save();
            }
        }
        $before = User::count();
        $this->spa('POST', '/api/v1/users', self::INPUT)->assertStatus($role === 'anonymous' ? 401 : 403);
        $this->assertDatabaseCount('users', $before);
    }

    /** @return array<string,array{array,string}> */
    public static function invalidInputs(): array
    {
        return [
            'name empty' => [['full_name' => ''], 'full_name'], 'name long' => [['full_name' => str_repeat('a', 121)], 'full_name'],
            'name array' => [['full_name' => []], 'full_name'], 'phone empty' => [['phone' => ''], 'phone'],
            'phone malformed' => [['phone' => '09-abcd-123'], 'phone'], 'phone short' => [['phone' => '123456789'], 'phone'],
            'phone too long' => [['phone' => '1234567890123456'], 'phone'], 'phone array' => [['phone' => []], 'phone'],
            'email malformed' => [['email' => 'not-email'], 'email'], 'email array' => [['email' => []], 'email'],
            'email long' => [['email' => str_repeat('a', 181).'@example.test'], 'email'],
            'admin forbidden' => [['role' => 'admin'], 'role'], 'resident forbidden' => [['role' => 'resident'], 'role'],
            'user forbidden' => [['role' => 'user'], 'role'], 'unknown role' => [['role' => 'staff'], 'role'],
            'role null' => [['role' => null], 'role'], 'role array' => [['role' => []], 'role'],
            'password empty' => [['password' => ''], 'password'], 'password short' => [['password' => 'short', 'password_confirmation' => 'short'], 'password'],
            'password array' => [['password' => []], 'password'], 'confirmation mismatch' => [['password_confirmation' => 'other password'], 'password'],
            'confirmation missing' => [['password_confirmation' => null], 'password'],
            'password ASCII bytes' => [['password' => str_repeat('a', 73), 'password_confirmation' => str_repeat('a', 73)], 'password'],
            'password UTF8 bytes' => [['password' => str_repeat('ế', 25), 'password_confirmation' => str_repeat('ế', 25)], 'password'],
            'password NUL' => [['password' => "private\0password", 'password_confirmation' => "private\0password"], 'password'],
        ];
    }

    #[DataProvider('invalidInputs')]
    public function test_invalid_input_never_creates_partial_staff_or_changes_admin(array $extra, string $field): void
    {
        $admin = $this->signIn();
        $before = $admin->fresh()->getRawOriginal();
        $this->spa('POST', '/api/v1/users', array_replace(self::INPUT, $extra))->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('users', 1);
        $this->assertSame($before, $admin->fresh()->getRawOriginal());
    }

    /** @return array<string,array{string}> */
    public static function prohibitedFields(): array
    {
        $fields = ['status', 'id', 'user_id', 'email_verified_at', 'remember_token', 'id_number', 'date_of_birth', 'gender', 'permanent_address', 'has_active_contract', 'active_contract', 'created_at', 'updated_at', 'permissions', 'is_admin'];

        return array_combine($fields, array_map(fn (string $field): array => [$field], $fields));
    }

    #[DataProvider('prohibitedFields')]
    public function test_server_controlled_fields_are_rejected_even_when_null(string $field): void
    {
        $this->signIn();
        $this->spa('POST', '/api/v1/users', self::INPUT + [$field => null])->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('users', 1);
    }

    /** @return array<string,array{string}> */
    public static function phoneInputs(): array
    {
        return ['local' => ['0901234567'], 'country plus' => [' +84901234567 '], 'country' => ['84901234567']];
    }

    #[DataProvider('phoneInputs')]
    public function test_identifiers_are_normalized_without_losing_the_password(string $phone): void
    {
        $this->signIn();
        $password = '  Private Staff!42  ';
        $response = $this->spa('POST', '/api/v1/users', array_replace(self::INPUT, ['full_name' => '  Nhân viên mới  ', 'phone' => $phone, 'email' => '  NORMALIZED@Example.test ', 'password' => $password, 'password_confirmation' => $password]))
            ->assertCreated()->assertJsonPath('data.full_name', 'Nhân viên mới')->assertJsonPath('data.phone', '0901234567')->assertJsonPath('data.email', 'normalized@example.test');
        $staff = User::findOrFail($response->json('data.id'));
        $this->assertTrue(Hash::check($password, $staff->password));
        $this->assertFalse(Hash::check(trim($password), $staff->password));
    }

    #[DataProvider('phoneInputs')]
    public function test_duplicate_legacy_phone_variants_are_rejected_without_rewriting_existing_account(string $legacyPhone): void
    {
        $this->signIn();
        $existing = User::factory()->role(UserRole::Resident)->locked()->create(['phone' => trim($legacyPhone)]);
        $before = $existing->fresh()->getRawOriginal();
        $this->spa('POST', '/api/v1/users', self::INPUT)->assertUnprocessable()->assertJsonValidationErrors('phone');
        $this->assertSame($before, $existing->fresh()->getRawOriginal());
        $this->assertDatabaseCount('users', 2);
    }

    public function test_duplicate_real_email_never_promotes_or_reactivates_an_existing_account(): void
    {
        $this->signIn();
        $existing = User::factory()->locked()->create(['email' => 'LEGACY@example.test']);
        $before = $existing->fresh()->getRawOriginal();
        $this->spa('POST', '/api/v1/users', self::INPUT + ['email' => ' legacy@EXAMPLE.test '])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertSame($before, $existing->fresh()->getRawOriginal());
        $this->assertDatabaseCount('users', 2);
    }

    public function test_exact_bcrypt_byte_boundaries_are_accepted(): void
    {
        $this->signIn();
        foreach ([str_repeat('a', 72), str_repeat('ế', 24)] as $index => $password) {
            $response = $this->spa('POST', '/api/v1/users', array_replace(self::INPUT, ['phone' => '090123456'.($index + 1), 'password' => $password, 'password_confirmation' => $password]))->assertCreated();
            $this->assertTrue(Hash::check($password, User::findOrFail($response->json('data.id'))->password));
        }
    }

    public function test_creation_requires_csrf_and_keeps_admin_authenticated_after_csrf_failure(): void
    {
        $admin = $this->signIn();
        $this->spa('POST', '/api/v1/users', self::INPUT, sendCsrf: false)->assertStatus(419);
        $this->spa('POST', '/api/v1/users', self::INPUT, ['HTTP_X_XSRF_TOKEN' => 'invalid-token'])->assertStatus(419);
        $this->assertDatabaseCount('users', 1);
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $admin->id);
    }

    public function test_created_staff_can_login_in_a_separate_cookie_jar_without_admin_api_access(): void
    {
        $admin = $this->signIn();
        $response = $this->spa('POST', '/api/v1/users', array_replace(self::INPUT, ['role' => 'guard']))->assertCreated();
        $adminJar = $this->cookieJar;
        $this->cookieJar = [];
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => self::INPUT['phone'], 'password' => self::INPUT['password']])->assertOk()->assertJsonPath('data.id', $response->json('data.id'))->assertJsonPath('data.role', 'guard');
        $this->spa('GET', '/api/v1/users')->assertForbidden();
        $this->cookieJar = $adminJar;
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $admin->id)->assertJsonPath('data.role', 'admin');
    }

    /** @return array<string,array{string}> */
    public static function missingSchema(): array
    {
        return ['users' => ['users'], 'contracts' => ['contracts'], 'rooms' => ['rooms'], 'buildings' => ['buildings']];
    }

    #[DataProvider('missingSchema')]
    public function test_missing_readback_schema_prevents_insert_and_returns_safe_503(string $missing): void
    {
        $this->signIn();
        Schema::shouldReceive('hasTable')->andReturnUsing(fn (string $table): bool => $table !== $missing);
        $response = $this->spa('POST', '/api/v1/users', self::INPUT)->assertStatus(503);
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertDatabaseCount('users', 1);
    }

    public function test_real_unique_race_rolls_back_creation_and_returns_safe_409(): void
    {
        $admin = $this->signIn();
        Event::listen('eloquent.creating: '.User::class, function (User $staff): void {
            DB::table('users')->insert(['full_name' => 'Bản ghi cạnh tranh', 'phone' => $staff->phone, 'password' => Hash::make('Another Private!42')]);
        });
        $response = $this->spa('POST', '/api/v1/users', self::INPUT)->assertConflict();
        foreach (['SQLSTATE', 'Duplicate entry', self::INPUT['password'], self::INPUT['phone']] as $sensitive) {
            $this->assertStringNotContainsString($sensitive, $response->getContent());
        }
        $this->assertDatabaseCount('users', 1);
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $admin->id);
    }

    public function test_actual_unexpected_query_failure_reports_only_sanitized_exception_and_no_partial_account(): void
    {
        $admin = $this->signIn();
        Exceptions::fake();
        $hash = '';
        Event::listen('eloquent.creating: '.User::class, function (User $staff) use (&$hash): void {
            $hash = $staff->getAttributes()['password'];
            // MySQL thật trả lỗi NOT NULL sau validation; không giả response hoặc QueryException.
            $staff->full_name = null;
        });
        $response = $this->spa('POST', '/api/v1/users', self::INPUT + ['email' => 'private-staff@example.test'])->assertStatus(500);
        Exceptions::assertReportedCount(1);
        Exceptions::assertReported(RuntimeException::class);
        Exceptions::assertNotReported(QueryException::class);
        $reported = Exceptions::reported()[0];
        $this->assertNull($reported->getPrevious());
        $this->assertNotSame('', $hash);
        foreach ([self::INPUT['password'], self::INPUT['phone'], 'private-staff@example.test', $hash, 'SQLSTATE', 'insert into', 'bindings'] as $sensitive) {
            $this->assertStringNotContainsString($sensitive, $response->getContent());
            $this->assertStringNotContainsString($sensitive, (string) $reported);
        }
        $this->assertDatabaseCount('users', 1);
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $admin->id);
    }
}
