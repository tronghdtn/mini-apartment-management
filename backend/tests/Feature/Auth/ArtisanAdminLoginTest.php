<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

/** Không migrate/RefreshDatabase: dùng schema test hiện có, rollback transaction của từng ca. */
class ArtisanAdminLoginTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    public static function passwords(): array
    {
        $cases = [];
        foreach (['ascii' => 'Command Only Test!42', 'spaces preserved' => '  Command Only Test!42  ', 'unicode' => 'MậtKhẩuChỉChoTest!42', 'shell characters' => 'Test!$a`b\\"c\'d42', '72 byte boundary' => str_repeat('a', 72)] as $name => $password) {
            foreach (['mock without terminator' => '', 'terminal LF' => "\n", 'terminal CRLF' => "\r\n"] as $terminal => $ending) {
                $cases[$name.' '.$terminal] = [$password, $ending];
            }
        }

        return $cases;
    }

    #[DataProvider('passwords')]
    public function test_admin_created_by_artisan_can_login_by_email_and_every_phone_variant(string $password, string $ending): void
    {
        $this->artisan('app:create-admin')
            ->expectsQuestion('Họ và tên', 'Admin hồi quy')
            ->expectsQuestion('Số điện thoại', ' +84901234567 ')
            ->expectsQuestion('Email (bắt buộc cho Admin)', '  ARTISAN-LOGIN@Example.test  ')
            ->expectsQuestion('Mật khẩu', $password.$ending)
            ->expectsQuestion('Nhập lại mật khẩu', $password.$ending)
            ->doesntExpectOutputToContain($password)
            ->assertSuccessful();

        $user = User::where('email', 'artisan-login@example.test')->sole();
        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertNull($user->email_verified_at);
        $hash = $user->getAuthPassword();
        $this->initializeSpaClient();

        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => 'Wrong Test Password!42'])
            ->assertUnprocessable()->assertJsonValidationErrors('identifier');
        foreach ([' ARTISAN-LOGIN@EXAMPLE.TEST ', '0901234567', '+84901234567', '84901234567'] as $identifier) {
            $sessionBefore = $this->sessionId();
            $response = $this->spa('POST', '/api/v1/auth/login', compact('identifier', 'password'))
                ->assertOk()->assertJsonPath('data.id', $user->id)->assertJsonPath('data.role', 'admin')->assertJsonPath('data.status', 'active');
            $this->assertSame(['id', 'full_name', 'email', 'phone', 'role', 'status', 'email_verified'], array_keys($response->json('data')));
            $this->assertStringNotContainsString($hash, $response->getContent());
            $this->assertNotSame($sessionBefore, $this->sessionId());
            $this->spa('GET', '/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $user->id);
            $this->spa('GET', '/api/v1/users')->assertOk();
            $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
            $this->spa('GET', '/api/v1/auth/me')->assertUnauthorized();
        }
        $this->assertTrue(Hash::check($password, $user->fresh()->getAuthPassword()));
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_a_password_hash_created_with_a_line_feed_explains_the_exact_identifier_422(): void
    {
        $password = 'Legacy Command Only Test!42';
        $user = User::factory()->role(UserRole::Admin)->create(['password' => $password."\n"]);
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => $password])
            ->assertUnprocessable()->assertJsonPath('errors.identifier.0', 'Thông tin đăng nhập không chính xác.');
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => $password."\n"])
            ->assertOk()->assertJsonPath('data.id', $user->id);
    }
}
