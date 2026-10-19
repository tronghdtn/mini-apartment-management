<?php

namespace Tests;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public const TEST_CONNECTION = 'mysql_test';

    public const TEST_DATABASE = 'mini_apartment_test';

    public const TEST_USERNAME = 'mini_apartment_test';

    /**
     * Chặn mọi test chạy ngoài database test (ví dụ database dev mini_apartment).
     * Kiểm tra ngay sau khi tạo ứng dụng, trước RefreshDatabase hay bất kỳ truy vấn nào.
     */
    public function createApplication()
    {
        $app = parent::createApplication();
        $config = $app->make(Repository::class);

        static::ensureSafeTestDatabase($config);

        // Code gọi thẳng DB::connection('mysql') trong lúc test cũng chỉ tới được database test.
        $config->set('database.connections.mysql', $config->get('database.connections.'.self::TEST_CONNECTION));

        return $app;
    }

    public static function ensureSafeTestDatabase(Repository $config): void
    {
        $name = $config->get('database.default');
        $connection = $config->get("database.connections.{$name}", []);

        if ($name !== self::TEST_CONNECTION) {
            throw new RuntimeException("Từ chối chạy test: kết nối mặc định là [{$name}], phải là [".self::TEST_CONNECTION.'].');
        }

        if (! empty($connection['url'])) {
            throw new RuntimeException("Từ chối chạy test: kết nối [{$name}] dùng DB_URL, không kiểm soát được database đích.");
        }

        if (($connection['database'] ?? null) !== self::TEST_DATABASE) {
            throw new RuntimeException('Từ chối chạy test trên database ['.($connection['database'] ?? 'null').'], chỉ cho phép ['.self::TEST_DATABASE.'].');
        }

        if (($connection['username'] ?? null) !== self::TEST_USERNAME) {
            throw new RuntimeException('Từ chối chạy test với tài khoản ['.($connection['username'] ?? 'null').'], chỉ cho phép ['.self::TEST_USERNAME.'].');
        }
    }
}
