<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use App\Notifications\ConfirmEmailChangeNotification;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class AccountEmailTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    private const PASSWORD = 'Account email tests only!42';

    private const NEW_PASSWORD = 'Brand new password only!43';

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->initializeSpaClient();
    }

    private function login(User $user, string $password = self::PASSWORD): void
    {
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => $password])->assertOk();
    }

    private function user(array $attributes = []): User
    {
        return User::factory()->role(UserRole::Resident)->create(array_merge(['password' => self::PASSWORD], $attributes));
    }

    /** @return array<string, string> */
    private function linkQuery(string $url): array
    {
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

        return $query;
    }

    public function test_forgot_password_answers_the_same_and_only_mails_active_verified_accounts(): void
    {
        $verified = $this->user(['email' => 'verified@example.test']);
        $this->user(['email' => 'unverified@example.test', 'email_verified_at' => null]);
        $this->user(['email' => 'locked@example.test', 'status' => 'locked']);
        $messages = [];
        foreach (['VERIFIED@example.test ', 'unverified@example.test', 'locked@example.test', 'nobody@example.test'] as $email) {
            $messages[] = $this->spa('POST', '/api/v1/auth/forgot-password', ['email' => $email])->assertStatus(202)->json('message');
        }
        $this->assertCount(1, array_unique($messages));
        Notification::assertSentTo($verified, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use ($verified) {
            $url = $notification->toMail($verified)->actionUrl;

            return str_contains($url, '/reset-password?') && $this->linkQuery($url)['email'] === 'verified@example.test';
        });
        Notification::assertSentTimes(ResetPasswordNotification::class, 1);
        $this->spa('POST', '/api/v1/auth/forgot-password', ['email' => 'not-an-email'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->spa('POST', '/api/v1/auth/forgot-password', ['email' => 'verified@example.test', 'user_id' => 1])->assertUnprocessable()->assertJsonValidationErrors('user_id');
    }

    public function test_reset_password_is_single_use_revokes_sessions_and_rejects_bad_or_expired_tokens(): void
    {
        $user = $this->user();
        $this->login($user);
        $this->assertGreaterThan(0, DB::table('sessions')->where('user_id', $user->id)->count());
        $token = Password::broker()->createToken($user);
        $body = ['email' => $user->email, 'token' => $token, 'password' => self::NEW_PASSWORD, 'password_confirmation' => self::NEW_PASSWORD];

        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/reset-password', [...$body, 'token' => 'wrong'])->assertUnprocessable()->assertJsonValidationErrors('token');
        $this->spa('POST', '/api/v1/auth/reset-password', [...$body, 'password_confirmation' => 'x'])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->spa('POST', '/api/v1/auth/reset-password', $body)->assertNoContent();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $user->fresh()->password));
        $this->assertSame(0, DB::table('sessions')->where('user_id', $user->id)->count());
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/reset-password', $body)->assertUnprocessable()->assertJsonValidationErrors('token');
        $this->login($user, self::NEW_PASSWORD);

        $expired = $this->user();
        $old = Password::broker()->createToken($expired);
        $this->travel(61)->minutes();
        $this->spa('POST', '/api/v1/auth/reset-password', ['email' => $expired->email, 'token' => $old,
            'password' => self::NEW_PASSWORD, 'password_confirmation' => self::NEW_PASSWORD])->assertUnprocessable()->assertJsonValidationErrors('token');
        $this->travelBack();

        $locked = $this->user();
        $lockedToken = Password::broker()->createToken($locked);
        $locked->forceFill(['status' => 'locked'])->save();
        $this->spa('POST', '/api/v1/auth/reset-password', ['email' => $locked->email, 'token' => $lockedToken,
            'password' => self::NEW_PASSWORD, 'password_confirmation' => self::NEW_PASSWORD])->assertUnprocessable()->assertJsonValidationErrors('token');
        $this->assertTrue(Hash::check(self::PASSWORD, $locked->fresh()->password));
    }

    public function test_verification_link_is_signed_expires_and_dies_when_email_changes(): void
    {
        $this->spa('POST', '/api/v1/auth/email/verification-notification')->assertUnauthorized();
        $user = $this->user(['email_verified_at' => null]);
        $this->login($user);
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.email_verified', false);
        $this->spa('POST', '/api/v1/auth/email/verification-notification')->assertStatus(202);
        $url = null;
        Notification::assertSentTo($user, VerifyEmailNotification::class, function (VerifyEmailNotification $notification) use ($user, &$url) {
            $url = $notification->toMail($user)->actionUrl;

            return true;
        });
        $query = $this->linkQuery($url);
        $this->assertSame(['id', 'hash', 'expires', 'signature'], array_keys($query));

        $this->spa('POST', '/api/v1/auth/email/verify', [...$query, 'signature' => str_repeat('a', 64)])->assertUnprocessable()->assertJsonValidationErrors('link');
        $this->spa('POST', '/api/v1/auth/email/verify', [...$query, 'id' => (string) ($user->id + 1)])->assertUnprocessable()->assertJsonValidationErrors('link');
        $this->travel(61)->minutes();
        $this->spa('POST', '/api/v1/auth/email/verify', $query)->assertUnprocessable()->assertJsonValidationErrors('link');
        $this->travelBack();
        $this->spa('POST', '/api/v1/auth/email/verify', $query)->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->spa('POST', '/api/v1/auth/email/verify', $query)->assertOk();
        $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.email_verified', true);
        $this->spa('POST', '/api/v1/auth/email/verification-notification')->assertStatus(409);

        $other = $this->user(['email_verified_at' => null]);
        $this->login($other);
        $this->spa('POST', '/api/v1/auth/email/verification-notification')->assertStatus(202);
        Notification::assertSentTo($other, VerifyEmailNotification::class, function (VerifyEmailNotification $notification) use ($other, &$url) {
            $url = $notification->toMail($other)->actionUrl;

            return true;
        });
        $other->forceFill(['email' => 'changed@example.test'])->save();
        $this->spa('POST', '/api/v1/auth/email/verify', $this->linkQuery($url))->assertUnprocessable()->assertJsonValidationErrors('link');
        $this->assertNull($other->fresh()->email_verified_at);

        $noEmail = $this->user(['email' => null, 'email_verified_at' => null]);
        $this->login($noEmail);
        $this->spa('POST', '/api/v1/auth/email/verification-notification')->assertStatus(409);
    }

    public function test_change_email_waits_for_the_new_address_and_the_link_is_single_use(): void
    {
        $user = $this->user(['email' => 'old@example.test']);
        $taken = $this->user(['email' => 'taken@example.test']);
        $this->spa('POST', '/api/v1/auth/email/change', ['email' => 'new@example.test', 'current_password' => self::PASSWORD])->assertUnauthorized();
        $this->login($user);
        $this->spa('POST', '/api/v1/auth/email/change', ['email' => 'new@example.test', 'current_password' => 'wrong password'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->spa('POST', '/api/v1/auth/email/change', ['email' => 'OLD@example.test', 'current_password' => self::PASSWORD])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->spa('POST', '/api/v1/auth/email/change', ['email' => 'taken@example.test', 'current_password' => self::PASSWORD])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->spa('POST', '/api/v1/auth/email/change', ['email' => 'new@example.test', 'current_password' => self::PASSWORD, 'user_id' => $taken->id])
            ->assertUnprocessable()->assertJsonValidationErrors('user_id');
        $this->spa('POST', '/api/v1/auth/email/change', ['email' => ' New@Example.test ', 'current_password' => self::PASSWORD])->assertStatus(202);
        $this->assertSame('old@example.test', $user->fresh()->email);

        $url = null;
        Notification::assertSentOnDemand(ConfirmEmailChangeNotification::class, function ($notification, $channels, $notifiable) use (&$url) {
            $url = $notification->toMail($notifiable)->actionUrl;

            return $notifiable->routes['mail'] === 'new@example.test';
        });
        $this->assertStringNotContainsString('new%40example.test', $url);
        $token = $this->linkQuery($url)['token'];

        $this->spa('POST', '/api/v1/auth/email/change/confirm', ['token' => $token.'x'])->assertUnprocessable()->assertJsonValidationErrors('link');
        DB::table('password_reset_tokens')->insert(['email' => 'old@example.test', 'token' => Hash::make('x'), 'created_at' => now()]);
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/email/change/confirm', ['token' => $token])->assertOk()->assertJsonMissingPath('data');
        $fresh = $user->fresh();
        $this->assertSame('new@example.test', $fresh->email);
        $this->assertNotNull($fresh->email_verified_at);
        $this->assertSame(0, DB::table('password_reset_tokens')->where('email', 'old@example.test')->count());
        $this->spa('POST', '/api/v1/auth/email/change/confirm', ['token' => $token])->assertStatus(409);

        // Email mới bị tài khoản khác chiếm trước khi bấm xác nhận.
        $this->login($taken);
        $this->spa('POST', '/api/v1/auth/email/change', ['email' => 'race@example.test', 'current_password' => self::PASSWORD])->assertStatus(202);
        Notification::assertSentOnDemand(ConfirmEmailChangeNotification::class, function ($notification, $channels, $notifiable) use (&$url) {
            $url = $notification->toMail($notifiable)->actionUrl;

            return $notifiable->routes['mail'] === 'race@example.test';
        });
        $this->user(['email' => 'race@example.test']);
        $this->spa('POST', '/api/v1/auth/email/change/confirm', ['token' => $this->linkQuery($url)['token']])->assertStatus(409);
        $this->assertSame('taken@example.test', $taken->fresh()->email);

        $this->travel(61)->minutes();
        $this->spa('POST', '/api/v1/auth/email/change/confirm', ['token' => $this->linkQuery($url)['token']])->assertUnprocessable()->assertJsonValidationErrors('link');
    }
}
