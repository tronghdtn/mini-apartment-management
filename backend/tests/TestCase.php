<?php

namespace Tests;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public const TEST_CONNECTION = 'mysql_test';

    public const TEST_DATABASE = 'mini_apartment_test';

    public const TEST_USERNAME = 'mini_apartment_test';

    /** Tên kết nối không tồn tại, dùng khi guard từ chối để mọi truy cập DB đều thất bại. */
    public const BLOCKED_CONNECTION = 'blocked_by_test_guard';

    /**
     * Chặn mọi test chạy ngoài database test (ví dụ database dev mini_apartment).
     * Kiểm tra ngay sau khi tạo ứng dụng, trước RefreshDatabase hay bất kỳ truy vấn nào.
     */
    public function createApplication()
    {
        $app = parent::createApplication();
        $config = $app->make(Repository::class);

        static::guardTestDatabase($app);

        // Code gọi thẳng DB::connection('mysql') trong lúc test cũng chỉ tới được database test.
        $config->set('database.connections.mysql', $config->get('database.connections.'.self::TEST_CONNECTION));

        return $app;
    }

    /**
     * Kiểm tra database test; nếu không an toàn thì chặn mọi truy cập database của $app rồi báo lỗi.
     */
    public static function guardTestDatabase(Application $app): void
    {
        $config = $app->make(Repository::class);

        try {
            static::ensureSafeTestDatabase($config);
        } catch (RuntimeException $unsafe) {
            // PHPUnit vẫn gọi tearDown() của test con khi setUp lỗi, và facade DB/Schema/Eloquent
            // vẫn trỏ về ứng dụng vừa tạo. Phải cắt mọi kết nối trước khi báo lỗi, nếu không phần
            // dọn dẹp (gỡ migration, xóa dòng, Artisan migrate) sẽ chạy trên database sai.
            static::blockDatabaseAccess($app);

            throw $unsafe;
        }
    }

    /**
     * Ngắt các kết nối đã mở và xóa toàn bộ cấu hình kết nối của ứng dụng: sau đó mọi truy cập qua
     * DB, Schema, Eloquent, app('db') hay Artisan đều ném lỗi "not configured" thay vì chạm database.
     */
    public static function blockDatabaseAccess(Application $app): void
    {
        $database = $app->make('db');

        foreach (array_keys($database->getConnections()) as $name) {
            $database->purge($name);
        }

        $config = $app->make(Repository::class);
        $config->set('database.connections', []);
        $config->set('database.default', self::BLOCKED_CONNECTION);
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
