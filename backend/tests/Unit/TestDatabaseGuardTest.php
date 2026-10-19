<?php

namespace Tests\Unit;

use Illuminate\Config\Repository;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Tests\TestCase as AppTestCase;

class TestDatabaseGuardTest extends TestCase
{
    private const SAFE = ['driver' => 'mysql', 'database' => 'mini_apartment_test', 'username' => 'mini_apartment_test'];

    private function config(string $default, array $connection): Repository
    {
        return new Repository(['database' => ['default' => $default, 'connections' => [$default => $connection]]]);
    }

    /** @return array<string, array{string, array<string, string>}> */
    public static function unsafeConfigs(): array
    {
        return [
            'database dev' => ['mysql_test', ['database' => 'mini_apartment'] + self::SAFE],
            'tên khác có đuôi _test' => ['mysql_test', ['database' => 'other_test'] + self::SAFE],
            'tài khoản dev' => ['mysql_test', ['username' => 'mini_apartment'] + self::SAFE],
            'kết nối mysql thường' => ['mysql', self::SAFE],
            'có DB_URL' => ['mysql_test', ['url' => 'mysql://u:p@h/mini_apartment'] + self::SAFE],
            'sqlite memory' => ['sqlite', ['driver' => 'sqlite', 'database' => ':memory:']],
        ];
    }

    /** @param array<string, string> $connection */
    #[DataProvider('unsafeConfigs')]
    public function test_rejects_unsafe_configuration(string $default, array $connection): void
    {
        $this->expectException(RuntimeException::class);
        AppTestCase::ensureSafeTestDatabase($this->config($default, $connection));
    }

    public function test_accepts_only_exact_test_connection(): void
    {
        AppTestCase::ensureSafeTestDatabase($this->config('mysql_test', self::SAFE));
        $this->addToAssertionCount(1);
    }
}
