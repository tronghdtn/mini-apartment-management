<?php

namespace Tests\Feature\Console;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ResetAdminPasswordCommandTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    private const OLD_PASSWORD = 'Old Admin Test!42';

    private const NEW_PASSWORD = '  New Admin Test!42  ';

    public function test_operator_reset_repairs_legacy_password_without_changing_identity_or_business_data(): void
    {
        $user = User::factory()->role(UserRole::Admin)->unverified()->create(['password' => self::OLD_PASSWORD."\n"]);
        $before = $user->fresh()->getRawOriginal();
        $count = User::count();
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => self::OLD_PASSWORD."\n"])->assertOk();
        $this->spa('GET', '/api/v1/auth/me')->assertOk();

        $this->artisan('app:reset-admin-password')
            ->expectsQuestion('Email hoặc số điện thoại Admin', $user->email)
            ->expectsQuestion('Mật khẩu mới', self::NEW_PASSWORD."\n")
            ->expectsQuestion('Nhập lại mật khẩu mới', self::NEW_PASSWORD."\r\n")
            ->expectsConfirmation($this->confirmation($user), 'yes')
            ->doesntExpectOutputToContain(self::NEW_PASSWORD)
            ->expectsOutputToContain('Đã đặt lại mật khẩu Admin')
            ->assertSuccessful();

        $after = $user->fresh()->getRawOriginal();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $after['password']));
        $this->assertFalse(Hash::check(self::NEW_PASSWORD."\n", $after['password']));
        $this->assertFalse(Hash::check(self::OLD_PASSWORD."\n", $after['password']));
        $this->assertNotSame($before['remember_token'], $after['remember_token']);
        foreach (['password', 'remember_token', 'updated_at'] as $field) {
            unset($before[$field], $after[$field]);
        }
        $this->assertSame($before, $after);
        $this->assertSame($count, User::count());
        $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
        // Phiên bị flush sau reset: client phải lấy CSRF mới như React login() đang làm.
        $this->spa('GET', '/sanctum/csrf-cookie')->assertNoContent();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => self::OLD_PASSWORD])->assertUnprocessable();
        foreach ([$user->email, $user->phone] as $identifier) {
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => $identifier, 'password' => self::NEW_PASSWORD])->assertOk()->assertJsonPath('data.role', 'admin');
            $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
        }
    }

    public function test_cancel_preserves_every_account_field(): void
    {
        $user = User::factory()->role(UserRole::Admin)->create();
        $before = $user->fresh()->getRawOriginal();
        $this->artisan('app:reset-admin-password')
            ->expectsQuestion('Email hoặc số điện thoại Admin', $user->phone)
            ->expectsQuestion('Mật khẩu mới', self::NEW_PASSWORD)
            ->expectsQuestion('Nhập lại mật khẩu mới', self::NEW_PASSWORD)
            ->expectsConfirmation($this->confirmation($user), 'no')
            ->expectsOutputToContain('Đã hủy')
            ->assertSuccessful();
        $this->assertSame($before, $user->fresh()->getRawOriginal());
    }

    public static function invalidPasswords(): array
    {
        return [['', ''], ['short', 'short'], [self::NEW_PASSWORD, 'Different Test!42'], [str_repeat('a', 73), str_repeat('a', 73)], ["Test\0Password!42", "Test\0Password!42"]];
    }

    #[DataProvider('invalidPasswords')]
    public function test_invalid_password_never_changes_the_admin(string $password, string $confirmation): void
    {
        $user = User::factory()->role(UserRole::Admin)->create();
        $before = $user->fresh()->getRawOriginal();
        $this->artisan('app:reset-admin-password')
            ->expectsQuestion('Email hoặc số điện thoại Admin', $user->email)
            ->expectsQuestion('Mật khẩu mới', $password)
            ->expectsQuestion('Nhập lại mật khẩu mới', $confirmation)
            ->assertFailed();
        $this->assertSame($before, $user->fresh()->getRawOriginal());
    }

    public static function nonAdmins(): array
    {
        return [['user'], ['resident'], ['technician'], ['guard'], ['locked_admin'], ['missing']];
    }

    #[DataProvider('nonAdmins')]
    public function test_cannot_create_promote_or_unlock_an_account(string $kind): void
    {
        $user = $kind === 'missing' ? null : User::factory()->role($kind === 'locked_admin' ? UserRole::Admin : UserRole::from($kind))->create();
        if ($kind === 'locked_admin') {
            $user->status = UserStatus::Locked;
            $user->save();
        }
        $before = $user?->fresh()->getRawOriginal();
        $count = User::count();
        $this->artisan('app:reset-admin-password')
            ->expectsQuestion('Email hoặc số điện thoại Admin', $user?->email ?? 'missing-admin@example.test')
            ->expectsOutputToContain('Không tìm thấy duy nhất một Admin')
            ->assertFailed();
        $this->assertSame($count, User::count());
        $this->assertSame($before, $user?->fresh()->getRawOriginal());
    }

    public function test_non_interactive_reset_is_refused(): void
    {
        $user = User::factory()->role(UserRole::Admin)->create();
        $before = $user->fresh()->getRawOriginal();
        $this->artisan('app:reset-admin-password', ['--no-interaction' => true])->expectsOutputToContain('terminal tương tác')->assertFailed();
        $this->assertSame($before, $user->fresh()->getRawOriginal());
    }

    private function confirmation(User $user): string
    {
        return 'Đặt lại mật khẩu cho Admin #'.$user->id.'? Quyền và trạng thái được giữ nguyên.';
    }
}
