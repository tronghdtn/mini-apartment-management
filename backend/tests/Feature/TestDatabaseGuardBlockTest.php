<?php

namespace Tests\Feature;

use App\Models\User;
use Closure;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;
use Tests\TestCase;

/**
 * Khi guard từ chối, tearDown() của test con vẫn chạy. Mọi đường truy cập database của ứng dụng
 * phải bị cắt để phần dọn dẹp không thể gỡ migration hay xóa dữ liệu ở database sai (sự cố 09/11/2026).
 * Không dùng RefreshDatabase: ứng dụng bị chặn ở cuối test, không còn kết nối để rollback.
 */
class TestDatabaseGuardBlockTest extends TestCase
{
    public function test_guard_failure_blocks_every_database_path_used_by_cleanup(): void
    {
        DB::connection(self::TEST_CONNECTION)->select('select 1');
        $this->assertNotEmpty(DB::getConnections(), 'Cần một kết nối đang mở để kiểm tra việc ngắt');

        // Mô phỏng config sai như khi đọc config cache: kết nối mặc định không phải mysql_test.
        // Kết nối mysql đã được createApplication() trỏ về database test, nên không chạm tới dev.
        config(['database.default' => 'mysql']);

        try {
            TestCase::guardTestDatabase($this->app);
            $this->fail('Guard phải từ chối kết nối mặc định mysql');
        } catch (RuntimeException $unsafe) {
            $this->assertStringContainsString('kết nối mặc định là [mysql]', $unsafe->getMessage());
        }

        $this->assertSame([], DB::getConnections());

        $this->assertSame(self::BLOCKED_CONNECTION, DB::getDefaultConnection());
        $this->assertBlocked(fn () => DB::select('select 1'));
        $this->assertBlocked(fn () => DB::connection('mysql')->select('select 1'));
        $this->assertBlocked(fn () => DB::connection(self::TEST_CONNECTION)->select('select 1'));
        $this->assertBlocked(fn () => Schema::hasColumn('meter_readings', 'final_contract_id'));
        $this->assertBlocked(fn () => User::query()->count());
        $this->assertBlocked(fn () => app('db')->table('users')->whereIn('id', [0])->delete());
        $this->assertBlocked(fn () => Artisan::call('migrate:status'));
    }

    private function assertBlocked(Closure $access): void
    {
        try {
            $access();
            $this->fail('Truy cập database phải bị chặn sau khi guard từ chối');
        } catch (InvalidArgumentException $blocked) {
            $this->assertMatchesRegularExpression('/^Database connection \[[a-z_]+\] not configured\.$/', $blocked->getMessage());
        }
    }
}
