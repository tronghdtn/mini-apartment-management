<?php

namespace Tests\Feature\Console;

use App\Console\Commands\CreateAdminCommand;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Console\OutputStyle;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\PendingCommand;
use Mockery;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Symfony\Component\Console\Exception\RuntimeException as ConsoleRuntimeException;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Question\Question;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    private const INPUT = [
        'full_name' => 'Nguyễn Văn An',
        'phone' => '0901234567',
        'email' => 'admin@example.com',
        'password' => 'OnlyForTesting!42',
        'password_confirmation' => 'OnlyForTesting!42',
    ];

    public function test_creates_new_active_admin_with_hashed_password_and_unverified_email(): void
    {
        $this->runCommand()
            ->expectsOutputToContain('Đã tạo tài khoản Admin mới')
            ->assertSuccessful();

        $user = User::sole();
        $this->assertSame(self::INPUT['full_name'], $user->full_name);
        $this->assertSame(self::INPUT['email'], $user->email);
        $this->assertSame(self::INPUT['phone'], $user->phone);
        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertNull($user->email_verified_at);
        $this->assertNotSame(self::INPUT['password'], $user->password);
        $this->assertTrue(Hash::check(self::INPUT['password'], $user->password));
    }

    /** @return array<string, array{string}> */
    public static function duplicateFields(): array
    {
        return ['email' => ['email'], 'phone' => ['phone']];
    }

    #[DataProvider('duplicateFields')]
    public function test_duplicate_identity_never_promotes_or_unlocks_existing_account(string $field): void
    {
        $existing = User::factory()->locked()->create([$field => self::INPUT[$field]])->fresh();
        $before = $existing->getRawOriginal();

        $this->runCommand()
            ->expectsOutputToContain('đã được sử dụng')
            ->assertFailed();

        $this->assertDatabaseCount('users', 1);
        $this->assertSame($before, $existing->fresh()->getRawOriginal());
        $this->assertSame(UserRole::User, $existing->fresh()->role);
        $this->assertSame(UserStatus::Locked, $existing->fresh()->status);
    }

    /** @return array<string, array{array<string, string>, string}> */
    public static function invalidInputs(): array
    {
        return [
            'missing name' => [['full_name' => '   '], 'Họ và tên là bắt buộc'],
            'long name' => [['full_name' => str_repeat('A', 121)], 'Họ và tên không được vượt quá 120'],
            'missing email' => [['email' => '   '], 'Email là bắt buộc'],
            'invalid email' => [['email' => 'not-an-email'], 'Email không đúng định dạng'],
            'long email' => [['email' => str_repeat('a', 180).'@example.com'], 'Email không được vượt quá 191'],
            'missing phone' => [['phone' => ''], 'Số điện thoại là bắt buộc'],
            'invalid phone' => [['phone' => '090abc4567'], 'Số điện thoại phải gồm'],
            'short phone' => [['phone' => '123'], 'Số điện thoại phải gồm'],
            'long phone' => [['phone' => str_repeat('1', 21)], 'Số điện thoại không được vượt quá 20'],
            'missing password' => [['password' => '', 'password_confirmation' => ''], 'Mật khẩu là bắt buộc'],
            'short password' => [['password' => 'short', 'password_confirmation' => 'short'], 'Mật khẩu phải có ít nhất 8'],
            'wrong confirmation' => [['password_confirmation' => 'DifferentSecret!42'], 'Mật khẩu nhập lại không khớp'],
            'missing confirmation' => [['password_confirmation' => ''], 'Mật khẩu nhập lại không khớp'],
            'bcrypt byte limit' => [['password' => str_repeat('a', 73), 'password_confirmation' => str_repeat('a', 73)], 'Mật khẩu không được vượt quá 72 byte'],
            'unicode byte limit' => [['password' => str_repeat('ắ', 25), 'password_confirmation' => str_repeat('ắ', 25)], 'Mật khẩu không được vượt quá 72 byte'],
            'nul byte' => [['password' => "secret\0value", 'password_confirmation' => "secret\0value"], 'Mật khẩu không được chứa ký tự NUL'],
        ];
    }

    #[DataProvider('invalidInputs')]
    public function test_invalid_input_creates_no_account(array $overrides, string $error): void
    {
        $this->runCommand($overrides)->expectsOutputToContain($error)->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }

    public function test_trims_identity_fields_but_preserves_password_spaces(): void
    {
        $password = '  Keep These Spaces!42  ';
        $this->runCommand([
            'full_name' => '  '.self::INPUT['full_name'].'  ',
            'phone' => '  '.self::INPUT['phone'].'  ',
            'email' => '  '.self::INPUT['email'].'  ',
            'password' => $password,
            'password_confirmation' => $password,
        ])->assertSuccessful();

        $user = User::sole();
        $this->assertSame(self::INPUT['full_name'], $user->full_name);
        $this->assertSame(self::INPUT['phone'], $user->phone);
        $this->assertSame(self::INPUT['email'], $user->email);
        $this->assertTrue(Hash::check($password, $user->password));
        $this->assertFalse(Hash::check(trim($password), $user->password));
    }

    public function test_can_create_another_admin_without_changing_existing_admin(): void
    {
        $existing = User::factory()->role(UserRole::Admin)->create()->fresh();
        $before = $existing->getRawOriginal();

        $this->runCommand()->assertSuccessful();

        $this->assertDatabaseCount('users', 2);
        $this->assertSame($before, $existing->fresh()->getRawOriginal());
        $this->assertSame(2, User::where('role', UserRole::Admin)->count());
    }

    /** @return array<string, array{string}> */
    public static function passwordBoundaries(): array
    {
        return ['8 characters' => ['Abcd!234'], '72 bytes' => [str_repeat('a', 72)]];
    }

    #[DataProvider('passwordBoundaries')]
    public function test_valid_password_boundaries_are_hashed_without_truncation(string $password): void
    {
        $this->runCommand(['password' => $password, 'password_confirmation' => $password])->assertSuccessful();

        $this->assertTrue(Hash::check($password, User::sole()->password));
    }

    public function test_database_failure_reports_no_password_hash_or_sql_and_creates_no_account(): void
    {
        Exceptions::fake();
        $hash = null;
        Event::listen('eloquent.creating: '.User::class, function (User $user) use (&$hash): void {
            $hash = $user->password;

            throw new QueryException('mysql_test', 'insert into users (password) values (?)', [$hash], new PDOException('Test database failure'));
        });

        $this->runCommand()
            ->expectsOutputToContain('Không thể lưu tài khoản Admin')
            ->doesntExpectOutputToContain('insert into')
            ->doesntExpectOutputToContain('$2y$')
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);
        $this->assertNotNull($hash);
        Exceptions::assertReportedCount(1);
        Exceptions::assertReported(function (RuntimeException $exception) use ($hash): bool {
            return $exception->getPrevious() === null
                && ! str_contains($exception->getMessage(), $hash)
                && ! str_contains($exception->getMessage(), self::INPUT['password'])
                && ! str_contains($exception->getMessage(), 'insert into');
        });
    }

    public function test_unique_constraint_catches_conflict_after_validation_without_promoting_other_user(): void
    {
        Event::listen('eloquent.creating: '.User::class, function (User $user): void {
            // Mô phỏng tài khoản khác chiếm email sau khi validation đã qua.
            DB::table('users')->insert([
                'full_name' => 'Tài khoản khác',
                'email' => $user->email,
                'phone' => '0909999999',
                'password' => Hash::make('AnotherTestSecret!42'),
            ]);
        });

        $this->runCommand()
            ->expectsOutputToContain('Email hoặc số điện thoại vừa được sử dụng')
            ->assertFailed();

        $this->assertDatabaseCount('users', 1);
        $this->assertSame(UserRole::User, User::sole()->role);
        $this->assertDatabaseMissing('users', ['phone' => self::INPUT['phone']]);
    }

    public function test_non_interactive_execution_is_rejected_without_creating_an_account(): void
    {
        $this->artisan('app:create-admin', ['--no-interaction' => true])
            ->expectsOutputToContain('Lệnh yêu cầu nhập tương tác')
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }

    public function test_both_password_prompts_are_hidden_without_fallback_or_trimming(): void
    {
        $output = Mockery::mock(OutputStyle::class);
        foreach (['Họ và tên' => 'full_name', 'Số điện thoại' => 'phone', 'Email (bắt buộc cho Admin)' => 'email'] as $label => $field) {
            $output->shouldReceive('ask')->once()->with($label, null)->andReturn(self::INPUT[$field]);
        }
        $output->shouldReceive('askQuestion')->twice()->andReturnUsing(function (Question $question): string {
            $this->assertContains($question->getQuestion(), ['Mật khẩu', 'Nhập lại mật khẩu']);
            $this->assertTrue($question->isHidden());
            $this->assertFalse($question->isHiddenFallback());
            $this->assertFalse($question->isTrimmable());

            return self::INPUT['password'];
        });
        $output->shouldReceive('writeln')->once()->withArgs(fn (string $message, mixed $verbosity) => ! str_contains($message, self::INPUT['password']));

        $command = new CreateAdminCommand;
        $command->setLaravel($this->app);
        $command->setInput(new ArrayInput([]));
        $command->setOutput($output);

        $this->assertSame(0, $command->handle());
    }

    public function test_terminal_without_hidden_input_support_fails_before_writing(): void
    {
        $output = Mockery::mock(OutputStyle::class);
        $output->shouldReceive('ask')->times(3)->andReturn('Nguyễn Văn An', '0901234567', 'admin@example.com');
        $output->shouldReceive('askQuestion')->once()->andThrow(new ConsoleRuntimeException('Unable to hide the response.'));
        $output->shouldReceive('writeln')->once()->withArgs(fn (string $message, mixed $verbosity) => str_contains($message, 'Chưa tạo tài khoản'));

        $command = new CreateAdminCommand;
        $command->setLaravel($this->app);
        $command->setInput(new ArrayInput([]));
        $command->setOutput($output);

        $this->assertSame(1, $command->handle());
        $this->assertDatabaseCount('users', 0);
    }

    private function runCommand(array $overrides = []): PendingCommand
    {
        $data = array_replace(self::INPUT, $overrides);

        $command = $this->artisan('app:create-admin')
            ->expectsQuestion('Họ và tên', $data['full_name'])
            ->expectsQuestion('Số điện thoại', $data['phone'])
            ->expectsQuestion('Email (bắt buộc cho Admin)', $data['email'])
            ->expectsQuestion('Mật khẩu', $data['password'])
            ->expectsQuestion('Nhập lại mật khẩu', $data['password_confirmation']);

        foreach (array_unique([$data['password'], $data['password_confirmation']]) as $secret) {
            if ($secret !== '') {
                $command->doesntExpectOutputToContain($secret);
            }
        }

        return $command;
    }

    public function test_command_normalizes_email_and_vietnamese_phone_like_auth_api(): void
    {
        $this->runCommand(['email' => '  ADMIN@Example.com  ', 'phone' => ' +84901234567 '])->assertSuccessful();
        $this->assertSame('admin@example.com', User::sole()->email);
        $this->assertSame('0901234567', User::sole()->phone);
    }

    public function test_command_refuses_equivalent_legacy_phone_without_modifying_existing_user(): void
    {
        $existing = User::factory()->locked()->create(['phone' => '+84901234567'])->fresh();
        $before = $existing->getRawOriginal();
        $this->runCommand()->expectsOutputToContain('Số điện thoại đã được sử dụng')->assertFailed();
        $this->assertDatabaseCount('users', 1);
        $this->assertSame($before, $existing->fresh()->getRawOriginal());
    }
}
