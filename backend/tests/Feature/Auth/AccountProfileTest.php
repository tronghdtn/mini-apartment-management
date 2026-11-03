<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use App\Services\AccountProfileService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class AccountProfileTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    private const OLD_PASSWORD = 'Profile old test only!42';

    private const NEW_PASSWORD = ' New profile test only!43 ';

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function login(?User $user = null): User
    {
        $user ??= User::factory()->create(['password' => self::OLD_PASSWORD]);
        $this->cookieJar = [];
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => self::OLD_PASSWORD])->assertOk();

        return $user->fresh();
    }

    private function passwordData(array $changes = []): array
    {
        return array_replace(['current_password' => self::OLD_PASSWORD,
            'password' => self::NEW_PASSWORD, 'password_confirmation' => self::NEW_PASSWORD], $changes);
    }

    public static function roles(): array
    {
        return array_map(fn ($role) => [$role], UserRole::cases());
    }

    #[DataProvider('roles')]
    public function test_each_role_updates_only_own_name_and_password_then_must_login_again(UserRole $role): void
    {
        $user = $this->login(User::factory()->role($role)->create(['password' => self::OLD_PASSWORD]));
        $other = User::factory()->create()->fresh();
        $before = $user->getRawOriginal();
        $sid = $this->sessionId();
        $this->spa('PATCH', '/api/v1/auth/profile', ['full_name' => '  Nguyễn An mới  '])->assertOk()
            ->assertExactJson(['data' => ['id' => $user->id, 'full_name' => 'Nguyễn An mới', 'email' => $user->email,
                'phone' => $user->phone, 'role' => $role->value, 'status' => 'active', 'email_verified' => true]]);
        $this->assertSame($sid, $this->sessionId());
        $this->assertSame($before['password'], $user->fresh()->getAuthPassword());
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.full_name', 'Nguyễn An mới');
        $response = $this->spa('PUT', '/api/v1/auth/password', $this->passwordData())->assertNoContent();
        $this->assertSame('', $response->getContent());
        $saved = $user->fresh();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $saved->getAuthPassword()));
        $this->assertFalse(Hash::check(trim(self::NEW_PASSWORD), $saved->getAuthPassword()));
        $this->assertNotSame($before['remember_token'], $saved->getRememberToken());
        foreach (['phone', 'email', 'role', 'status', 'email_verified_at', 'id_number'] as $field) {
            $this->assertSame($before[$field], $saved->getRawOriginal($field));
        }
        $this->assertSame($other->getRawOriginal(), $other->fresh()->getRawOriginal());
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => self::OLD_PASSWORD])->assertUnprocessable();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => self::NEW_PASSWORD])->assertOk();
    }

    public function test_two_fresh_sessions_are_revoked_without_having_called_me_and_other_user_keeps_session(): void
    {
        $user = $this->login();
        $first = $this->cookieJar;
        $firstId = $this->sessionId();
        $this->login($user);
        $second = $this->cookieJar;
        $secondId = $this->sessionId();
        $foreign = $this->login();
        $foreignCookies = $this->cookieJar;
        $this->cookieJar = $second;
        $this->spa('PUT', '/api/v1/auth/password', $this->passwordData())->assertNoContent();
        $this->assertFalse(DB::table('sessions')->whereIn('id', [$firstId, $secondId])->exists());
        foreach ([$first, $second] as $cookies) {
            $this->cookieJar = $cookies;
            $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
        }
        $this->cookieJar = $foreignCookies;
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $foreign->id);
    }

    public function test_login_pins_checked_hash_so_an_in_flight_old_login_cannot_revive_authentication(): void
    {
        $user = $this->login(); // No /me: the login itself must already pin the hash.
        $row = DB::table('sessions')->where('id', $this->sessionId())->first();
        $payload = json_decode(base64_decode($row->payload), true, flags: JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('password_hash_web', $payload);
        $user->password = self::NEW_PASSWORD;
        $user->save(); // Simulate an old login session written after another process rotated the password.
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_registration_also_pins_the_checked_hash(): void
    {
        $this->spa('POST', '/api/v1/auth/register', ['full_name' => 'Profile test', 'phone' => '0900064312',
            'password' => self::OLD_PASSWORD, 'password_confirmation' => self::OLD_PASSWORD])->assertCreated();
        $row = DB::table('sessions')->where('id', $this->sessionId())->first();
        $this->assertArrayHasKey('password_hash_web', json_decode(base64_decode($row->payload), true, flags: JSON_THROW_ON_ERROR));
    }

    public function test_legacy_session_without_password_stamp_is_also_removed(): void
    {
        $user = $this->login();
        $legacy = $this->cookieJar;
        $id = $this->sessionId();
        $row = DB::table('sessions')->where('id', $id)->first();
        $payload = json_decode(base64_decode($row->payload), true, flags: JSON_THROW_ON_ERROR);
        unset($payload['password_hash_web']);
        DB::table('sessions')->where('id', $id)->update(['payload' => base64_encode(json_encode($payload, JSON_THROW_ON_ERROR))]);
        $this->login($user);
        $this->spa('PUT', '/api/v1/auth/password', $this->passwordData())->assertNoContent();
        $this->cookieJar = $legacy;
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_anonymous_locked_and_missing_csrf_cannot_mutate(): void
    {
        foreach (['PATCH' => '/api/v1/auth/profile', 'PUT' => '/api/v1/auth/password'] as $method => $url) {
            $this->spa($method, $url)->assertUnauthorized();
        }
        $user = $this->login();
        $this->spa('PATCH', '/api/v1/auth/profile', ['full_name' => 'No CSRF'], sendCsrf: false)->assertStatus(419);
        $this->spa('PUT', '/api/v1/auth/password', $this->passwordData(), sendCsrf: false)->assertStatus(419);
        $user->status = 'locked';
        $user->save();
        $this->spa('PATCH', '/api/v1/auth/profile', ['full_name' => 'Locked'])->assertForbidden();
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
    }

    public static function invalidNames(): array
    {
        return [[[]], [['full_name' => '  ']], [['full_name' => str_repeat('a', 121)]], [['full_name' => []]],
            [['full_name' => 'Valid', 'role' => 'admin']], [['full_name' => 'Valid', 'user_id' => 1]],
            [['full_name' => 'Valid', 'phone' => '0901234567']], [['full_name' => 'Valid', 'email' => null]],
            [['full_name' => 'Valid', 'status' => 'locked']], [['full_name' => 'Valid', 'id_number' => 'forbidden']]];
    }

    #[DataProvider('invalidNames')]
    public function test_invalid_name_or_any_extra_field_is_rejected_without_writing(array $input): void
    {
        $user = $this->login();
        $before = $user->getRawOriginal();
        $this->spa('PATCH', '/api/v1/auth/profile', $input)->assertUnprocessable();
        $this->assertSame($before, $user->fresh()->getRawOriginal());
    }

    public static function invalidPasswords(): array
    {
        return [[['current_password' => 'Incorrect test password']], [['password_confirmation' => 'Mismatch']],
            [['password' => 'short', 'password_confirmation' => 'short']],
            [['password' => self::OLD_PASSWORD, 'password_confirmation' => self::OLD_PASSWORD]],
            [['password' => str_repeat('é', 37), 'password_confirmation' => str_repeat('é', 37)]],
            [['password' => "Unsafe\0password", 'password_confirmation' => "Unsafe\0password"]],
            [['role' => 'admin']], [['user_id' => 1]]];
    }

    #[DataProvider('invalidPasswords')]
    public function test_invalid_password_does_not_change_hash_or_revoke_session(array $changes): void
    {
        $user = $this->login();
        $before = $user->getRawOriginal();
        $this->spa('PUT', '/api/v1/auth/password', $this->passwordData($changes))->assertUnprocessable();
        $this->assertSame($before, $user->fresh()->getRawOriginal());
        $this->spa('GET', '/api/v1/auth/me')->assertOk();
    }

    public function test_password_and_name_rate_limits_return_429_without_mutating(): void
    {
        $user = $this->login();
        for ($n = 0; $n < 5; $n++) {
            $this->spa('PUT', '/api/v1/auth/password', $this->passwordData(['current_password' => 'Incorrect']))->assertUnprocessable();
        }
        $this->spa('PUT', '/api/v1/auth/password', $this->passwordData())->assertStatus(429);
        for ($n = 0; $n < 30; $n++) {
            $this->spa('PATCH', '/api/v1/auth/profile', ['full_name' => ''])->assertUnprocessable();
        }
        $this->spa('PATCH', '/api/v1/auth/profile', ['full_name' => 'Should not save'])->assertStatus(429);
        $this->assertSame($user->getRawOriginal(), $user->fresh()->getRawOriginal());
    }

    public function test_stale_authenticated_request_cannot_overwrite_password_or_name_after_a_change(): void
    {
        $user = $this->login();
        $stale = $user->fresh();
        $service = app(AccountProfileService::class);
        $service->changePassword($user, $this->passwordData());
        $before = $user->fresh()->getRawOriginal();
        try {
            $service->updateName($stale, ['full_name' => 'Stale']);
            $this->fail('Stale credentials must be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
        }
        $this->assertSame($before, $user->fresh()->getRawOriginal());
    }

    public static function sqlFailures(): array
    {
        return [['name'], ['password']];
    }

    #[DataProvider('sqlFailures')]
    public function test_sql_failure_rolls_back_update_and_preserves_session_without_leaking_input(string $action): void
    {
        $user = $this->login();
        $before = $user->getRawOriginal();
        $sid = $this->sessionId();
        Event::listen('eloquent.updated: '.User::class, function () {
            DB::statement('INSERT INTO nonexistent_profile_rollback_probe (id) VALUES (1)');
        });
        $response = ($action === 'name'
            ? $this->spa('PATCH', '/api/v1/auth/profile', ['full_name' => 'Rollback test name'])
            : $this->spa('PUT', '/api/v1/auth/password', $this->passwordData()))->assertStatus(500);
        $this->assertSame($before, $user->fresh()->getRawOriginal());
        $this->assertTrue(DB::table('sessions')->where('id', $sid)->exists());
        $this->assertStringNotContainsString(self::OLD_PASSWORD, $response->getContent());
        $this->assertStringNotContainsString(self::NEW_PASSWORD, $response->getContent());
        $this->spa('GET', '/api/v1/auth/me')->assertOk();
    }

    public function test_service_rechecks_locked_status_after_request_authentication(): void
    {
        $actor = $this->login();
        User::whereKey($actor->id)->update(['status' => 'locked']);
        $before = $actor->fresh()->getRawOriginal();
        foreach (['name', 'password'] as $action) {
            try {
                $service = app(AccountProfileService::class);
                $action === 'name' ? $service->updateName($actor, ['full_name' => 'Blocked']) : $service->changePassword($actor, $this->passwordData());
                $this->fail('Locked account must be rechecked under lock.');
            } catch (HttpException $failure) {
                $this->assertSame(403, $failure->getStatusCode());
            }
        }
        $this->assertSame($before, $actor->fresh()->getRawOriginal());
    }

    public function test_literal_dotted_or_wildcard_control_keys_are_rejected_without_mutation(): void
    {
        $user = $this->login();
        $before = $user->getRawOriginal();
        foreach (['role.admin', 'user_id.*', '*'] as $field) {
            $this->spa('PATCH', '/api/v1/auth/profile', ['full_name' => 'Should not save', $field => 'Forbidden'])->assertUnprocessable();
            $this->spa('PUT', '/api/v1/auth/password', $this->passwordData([$field => 'Forbidden']))->assertUnprocessable();
        }
        $this->assertSame($before, $user->fresh()->getRawOriginal());
    }
}
