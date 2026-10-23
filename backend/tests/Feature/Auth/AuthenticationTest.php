<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const INPUT = ['full_name' => 'Nguyễn Văn An', 'phone' => '0901234567', 'password' => 'Test Password!42', 'password_confirmation' => 'Test Password!42'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
        // Route chỉ dành cho test: không tạo API quản lý nghiệp vụ để thử quyền.
        Route::middleware(['api', 'auth:sanctum', 'active', 'role:admin'])->get('/api/v1/testing/admin', fn () => response()->json(['data' => ['allowed' => true]]));
    }

    /** @return array<string, array{array}> */
    public static function registrationEmails(): array
    {
        return ['email' => [['email' => '  USER@Example.com ']], 'missing' => [[]], 'null' => [['email' => null]], 'empty' => [['email' => '   ']]];
    }

    #[DataProvider('registrationEmails')]
    public function test_registers_and_logs_in_only_as_active_user(array $extra): void
    {
        $before = $this->sessionId();
        $response = $this->spa('POST', '/api/v1/auth/register', self::INPUT + $extra)
            ->assertCreated()->assertJsonPath('data.role', 'user')->assertJsonPath('data.status', 'active');
        $this->assertSafeUser($response->json());

        $user = User::sole();
        $this->assertSame(trim($extra['email'] ?? '') !== '' ? 'user@example.com' : null, $user->email);
        $this->assertNull($user->email_verified_at);
        $this->assertTrue(Hash::check(self::INPUT['password'], $user->password));
        $this->assertNotSame($before, $this->sessionId());
        $this->assertDatabaseMissing('sessions', ['id' => $before]);
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_multiple_registrations_without_email_are_allowed(): void
    {
        $this->spa('POST', '/api/v1/auth/register', self::INPUT)->assertCreated();
        $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
        $this->spa('POST', '/api/v1/auth/register', array_replace(self::INPUT, ['phone' => '0901234568']))->assertCreated();
        $this->assertSame(2, User::whereNull('email')->count());
    }

    /** @return array<string, array{array, string}> */
    public static function invalidRegistration(): array
    {
        return [
            'name required' => [['full_name' => ''], 'full_name'],
            'name length' => [['full_name' => str_repeat('a', 121)], 'full_name'],
            'name array' => [['full_name' => []], 'full_name'],
            'phone required' => [['phone' => null], 'phone'],
            'phone malformed' => [['phone' => 'abc123'], 'phone'],
            'phone array' => [['phone' => []], 'phone'],
            'email invalid' => [['email' => 'not-email'], 'email'],
            'email array' => [['email' => []], 'email'],
            'password missing' => [['password' => ''], 'password'],
            'password array' => [['password' => []], 'password'],
            'password short' => [['password' => 'short', 'password_confirmation' => 'short'], 'password'],
            'password mismatched' => [['password_confirmation' => 'wrong'], 'password'],
            'bcrypt limit' => [['password' => str_repeat('a', 73), 'password_confirmation' => str_repeat('a', 73)], 'password'],
            'admin escalation' => [['role' => 'admin'], 'role'],
            'resident escalation' => [['role' => 'resident'], 'role'],
            'technician escalation' => [['role' => 'technician'], 'role'],
            'guard escalation' => [['role' => 'guard'], 'role'],
            'role null is still forbidden' => [['role' => null], 'role'],
            'status override' => [['status' => 'locked'], 'status'],
        ];
    }

    #[DataProvider('invalidRegistration')]
    public function test_invalid_registration_is_rejected_without_creating_user(array $extra, string $field): void
    {
        $this->spa('POST', '/api/v1/auth/register', array_replace(self::INPUT, $extra))->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('users', 0);
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_sensitive_extra_input_is_not_persisted(): void
    {
        $this->spa('POST', '/api/v1/auth/register', self::INPUT + ['id_number' => '001200000123', 'email_verified_at' => now()->toISOString(), 'id' => 9999])->assertCreated();
        $user = User::sole();
        $this->assertNull($user->id_number);
        $this->assertNull($user->email_verified_at);
        $this->assertNotSame(9999, $user->id);
    }

    /** @return array<string, array{string}> */
    public static function duplicateFields(): array
    {
        return ['email' => ['email'], 'phone' => ['phone']];
    }

    #[DataProvider('duplicateFields')]
    public function test_duplicate_registration_preserves_existing_user(string $field): void
    {
        $value = $field === 'email' ? 'USER@EXAMPLE.COM' : '+84901234567';
        $existing = User::factory()->locked()->create([$field => $value])->fresh();
        $before = $existing->getRawOriginal();
        $this->spa('POST', '/api/v1/auth/register', self::INPUT + ['email' => 'user@example.com'])->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('users', 1);
        $this->assertSame($before, $existing->fresh()->getRawOriginal());
    }

    public function test_phone_is_canonicalized_before_saving(): void
    {
        $this->spa('POST', '/api/v1/auth/register', array_replace(self::INPUT, ['phone' => '  +84901234567  ']))->assertCreated()->assertJsonPath('data.phone', '0901234567');
    }

    public function test_unique_conflict_after_validation_is_a_safe_409(): void
    {
        Event::listen('eloquent.creating: '.User::class, function (User $user): void {
            DB::table('users')->insert(['full_name' => 'Khác', 'phone' => $user->phone, 'password' => Hash::make('AnotherTest!42')]);
        });
        $this->spa('POST', '/api/v1/auth/register', self::INPUT)->assertConflict()->assertExactJson(['message' => 'Email hoặc số điện thoại vừa được sử dụng. Vui lòng kiểm tra lại.']);
        $this->assertDatabaseCount('users', 1);
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    /** @return array<string, array{string}> */
    public static function loginIdentifiers(): array
    {
        return ['email' => ['  USER@EXAMPLE.COM  '], 'phone' => ['0901234567'], 'country plus' => ['+84901234567'], 'country' => ['84901234567']];
    }

    #[DataProvider('loginIdentifiers')]
    public function test_login_restores_user_from_encrypted_cookie_and_database_session(string $identifier): void
    {
        $user = User::factory()->unverified()->create(['email' => 'user@example.com', 'phone' => self::INPUT['phone'], 'password' => self::INPUT['password']]);
        $old = $this->sessionId();
        $oldJar = $this->cookieJar;
        $response = $this->spa('POST', '/api/v1/auth/login', ['identifier' => $identifier, 'password' => self::INPUT['password']])->assertOk()->assertJsonPath('data.id', $user->id);
        $this->assertSafeUser($response->json());
        $this->assertNotSame($old, $this->sessionId());
        $this->assertDatabaseMissing('sessions', ['id' => $old]);
        $this->assertDatabaseHas('sessions', ['id' => $this->sessionId(), 'user_id' => $user->id]);
        $this->assertTrue($response->getCookie(config('session.cookie'), false)->isHttpOnly());
        $this->assertFalse($response->getCookie('XSRF-TOKEN', false)->isHttpOnly());
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $user->id);
        $this->cookieJar = $oldJar;
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_legacy_phone_format_is_read_without_rewriting_existing_account(): void
    {
        $user = User::factory()->create(['phone' => '+84901234567', 'password' => self::INPUT['password']]);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => '0901234567', 'password' => self::INPUT['password']])->assertOk()->assertJsonPath('data.id', $user->id);
        $this->assertSame('+84901234567', $user->fresh()->phone);
    }

    public function test_ambiguous_legacy_phone_never_selects_a_user_by_password(): void
    {
        User::factory()->create(['phone' => '+84901234567', 'password' => self::INPUT['password']]);
        User::factory()->create(['phone' => '0901234567', 'password' => 'Different!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => self::INPUT['phone'], 'password' => self::INPUT['password']])->assertUnprocessable()->assertJsonValidationErrors('identifier');
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_incorrect_password_and_nonexistent_account_have_same_response(): void
    {
        User::factory()->create(['phone' => self::INPUT['phone'], 'password' => 'Different!42']);
        $wrong = $this->spa('POST', '/api/v1/auth/login', ['identifier' => self::INPUT['phone'], 'password' => self::INPUT['password']])->assertUnprocessable()->json();
        $unknown = $this->spa('POST', '/api/v1/auth/login', ['identifier' => '0999999999', 'password' => self::INPUT['password']])->assertUnprocessable()->json();
        $this->assertSame($wrong, $unknown);
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_locked_login_is_forbidden_only_after_valid_password(): void
    {
        User::factory()->locked()->create(['phone' => self::INPUT['phone'], 'password' => self::INPUT['password']]);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => self::INPUT['phone'], 'password' => 'wrong'])->assertUnprocessable();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => self::INPUT['phone'], 'password' => self::INPUT['password']])->assertForbidden();
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_login_throttle_uses_canonical_identity_even_if_ip_changes(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => '+84901234567', 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => '0901234567', 'password' => 'wrong'], ['REMOTE_ADDR' => '192.0.2.42'])->assertStatus(429)->assertHeader('Retry-After');
        $this->travel(61)->seconds();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => '84901234567', 'password' => 'wrong'])->assertUnprocessable();
    }

    public function test_logout_invalidates_server_session_rotates_csrf_and_rejects_old_cookie(): void
    {
        $this->spa('POST', '/api/v1/auth/register', self::INPUT)->assertCreated();
        $oldJar = $this->cookieJar;
        $oldId = $this->sessionId();
        $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
        $this->assertNotSame($oldId, $this->sessionId());
        $this->assertNotSame($oldJar['XSRF-TOKEN'], $this->cookieJar['XSRF-TOKEN']);
        $this->assertDatabaseMissing('sessions', ['id' => $oldId]);
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
        $this->cookieJar = $oldJar;
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_login_and_logout_require_csrf_and_missing_token_does_not_log_user_out(): void
    {
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => self::INPUT['phone'], 'password' => self::INPUT['password']], [], false)->assertStatus(419);
        $this->spa('POST', '/api/v1/auth/register', self::INPUT)->assertCreated();
        $this->spa('POST', '/api/v1/auth/logout', [], [], false)->assertStatus(419);
        $this->spa('GET', '/api/v1/auth/me')->assertOk();
    }

    public function test_tampered_encrypted_cookie_cannot_authenticate(): void
    {
        $this->spa('POST', '/api/v1/auth/register', self::INPUT)->assertCreated();
        $this->cookieJar[config('session.cookie')] = 'tampered-cookie';
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_role_change_is_read_from_database_on_next_request(): void
    {
        $user = User::factory()->role(UserRole::Admin)->create(['phone' => self::INPUT['phone'], 'password' => self::INPUT['password']]);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => self::INPUT['phone'], 'password' => self::INPUT['password']])->assertOk();
        $this->spa('GET', '/api/v1/testing/admin')->assertOk();
        DB::table('users')->where('id', $user->id)->update(['role' => UserRole::User->value]);
        $this->spa('GET', '/api/v1/testing/admin')->assertForbidden();
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.role', 'user');
    }

    /** @return array<string, array{array, string}> */
    public static function invalidLogin(): array
    {
        return [
            'identifier missing' => [['identifier' => null], 'identifier'],
            'identifier array' => [['identifier' => []], 'identifier'],
            'identifier length' => [['identifier' => str_repeat('x', 192)], 'identifier'],
            'password missing' => [['password' => null], 'password'],
            'password array' => [['password' => []], 'password'],
            'bcrypt truncation' => [['password' => str_repeat('a', 73)], 'password'],
            'nul byte' => [['password' => "secret\0value"], 'password'],
        ];
    }

    #[DataProvider('invalidLogin')]
    public function test_invalid_login_does_not_create_a_session(array $extra, string $field): void
    {
        User::factory()->create(['phone' => self::INPUT['phone'], 'password' => str_repeat('a', 72)]);
        $this->spa('POST', '/api/v1/auth/login', array_replace(['identifier' => self::INPUT['phone'], 'password' => self::INPUT['password']], $extra))->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_registration_is_rate_limited_without_writing_invalid_data(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->spa('POST', '/api/v1/auth/register', [], ['HTTP_X_FORWARDED_FOR' => '192.0.2.'.($i + 1)])->assertUnprocessable();
        }
        $this->spa('POST', '/api/v1/auth/register', self::INPUT, ['HTTP_X_FORWARDED_FOR' => '192.0.2.99'])->assertStatus(429)->assertHeader('Retry-After');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_login_ip_limit_stops_rotating_identifiers(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => 'account'.$i.'@example.com', 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => 'another@example.com', 'password' => 'wrong'])->assertStatus(429);
    }

    public function test_locked_account_after_login_loses_session_and_is_not_restored_when_unlocked(): void
    {
        $this->spa('POST', '/api/v1/auth/register', self::INPUT)->assertCreated();
        $oldJar = $this->cookieJar;
        $oldId = $this->sessionId();
        User::query()->update(['status' => UserStatus::Locked->value]);
        $this->spa('GET', '/api/v1/auth/me')->assertForbidden();
        $this->assertDatabaseMissing('sessions', ['id' => $oldId]);
        User::query()->update(['status' => UserStatus::Active->value]);
        $this->cookieJar = $oldJar;
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    /** @return array<string, array{string}> */
    public static function roles(): array
    {
        return array_combine(array_column(UserRole::cases(), 'value'), array_map(fn (UserRole $role) => [$role->value], UserRole::cases()));
    }

    #[DataProvider('roles')]
    public function test_backend_checks_role_from_database(string $role): void
    {
        $user = User::factory()->role(UserRole::from($role))->unverified()->create(['phone' => self::INPUT['phone'], 'password' => self::INPUT['password'], 'id_number' => '001200000123']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => self::INPUT['phone'], 'password' => self::INPUT['password']])->assertOk();
        $me = $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.role', $role);
        $this->assertSafeUser($me->json());
        $this->assertSame($role === 'admin' ? 200 : 403, $this->spa('GET', '/api/v1/testing/admin', ['role' => 'admin'])->status());
        $this->assertSame($role, $user->fresh()->role->value);
    }

    public function test_unauthenticated_and_bearer_requests_are_rejected_without_token_database(): void
    {
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized()->assertExactJson(['message' => 'Bạn chưa đăng nhập.']);
        $this->spa('GET', '/api/v1/testing/admin')->assertUnauthorized();
        $this->spa('POST', '/api/v1/auth/logout')->assertUnauthorized();
        $this->cookieJar = [];
        $this->spa('GET', '/api/v1/auth/me', [], ['HTTP_AUTHORIZATION' => 'Bearer 123|arbitrary-token'])->assertUnauthorized();
    }

    public function test_real_csrf_checks_reject_missing_and_invalid_tokens_without_creating_account(): void
    {
        $this->spa('POST', '/api/v1/auth/register', self::INPUT, [], false)->assertStatus(419);
        $this->spa('POST', '/api/v1/auth/register', self::INPUT, ['HTTP_X_XSRF_TOKEN' => 'invalid'])->assertStatus(419);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_untrusted_origin_cannot_start_auth_session(): void
    {
        $this->spa('POST', '/api/v1/auth/register', self::INPUT, ['HTTP_ORIGIN' => 'https://other.invalid', 'HTTP_REFERER' => 'https://other.invalid/'])->assertStatus(419);
        $this->assertDatabaseCount('users', 0);
    }

    private function assertSafeUser(array $json): void
    {
        $this->assertSame(['data'], array_keys($json));
        $keys = array_keys($json['data']);
        sort($keys);
        $this->assertSame(['email', 'full_name', 'id', 'phone', 'role', 'status'], $keys);
    }
}
