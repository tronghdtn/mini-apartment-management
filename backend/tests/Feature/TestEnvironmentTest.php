<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/** Kiểm tra môi trường chuẩn bị cho migrations nghiệp vụ (P1–P4, DB-D11 trong DATABASE_IMPLEMENTATION_PLAN). */
class TestEnvironmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_runs_on_dedicated_mysql_test_database_and_account(): void
    {
        $this->assertSame('mysql_test', DB::getDefaultConnection());
        $this->assertSame('mysql', DB::connection()->getDriverName());
        $this->assertSame('mini_apartment_test', DB::selectOne('select database() as db')->db);
        $this->assertSame('mini_apartment_test@%', DB::selectOne('select current_user() as u')->u);
        $this->assertTrue(Schema::hasTable('sessions'), 'Migrations phải chạy được trên database test');
    }

    public function test_named_mysql_connection_is_redirected_to_test_database(): void
    {
        $this->assertSame('mini_apartment_test', DB::connection('mysql')->selectOne('select database() as db')->db);
    }

    public function test_test_account_cannot_read_development_database(): void
    {
        try {
            DB::select('select count(*) as c from mini_apartment.users');
            $this->fail('Tài khoản test không được phép đọc database dev mini_apartment');
        } catch (QueryException $e) {
            $this->assertSame(1142, $e->errorInfo[1] ?? null, $e->getMessage()); // ER_TABLEACCESS_DENIED_ERROR
        }
    }

    public function test_timestamps_are_utc_and_business_timezone_is_vietnam(): void
    {
        $this->assertSame('UTC', config('app.timezone'));
        $this->assertSame('UTC', now()->getTimezone()->getName());
        $this->assertSame('Asia/Ho_Chi_Minh', config('app.business_timezone'));
        $this->assertSame('+00:00', DB::selectOne('select @@session.time_zone as tz')->tz);
        $this->assertSame(1, (int) DB::selectOne('select NOW() = UTC_TIMESTAMP() as same')->same);
    }

    public function test_queue_runs_synchronously_without_worker(): void
    {
        $this->assertSame('sync', config('queue.default'));
    }

    public function test_morph_map_is_enforced(): void
    {
        $this->assertSame('user', (new User)->getMorphClass());
    }
}
