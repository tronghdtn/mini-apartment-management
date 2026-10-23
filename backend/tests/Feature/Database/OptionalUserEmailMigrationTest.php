<?php

namespace Tests\Feature\Database;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/** Không dùng RefreshDatabase: ALTER TABLE của MySQL tự commit. Chỉ dọn các dòng test tự tạo. */
class OptionalUserEmailMigrationTest extends TestCase
{
    private const MIGRATION = '2026_10_22_100001_make_users_email_nullable';

    /** @var list<int> */
    private array $userIds = [];

    protected function setUp(): void
    {
        parent::setUp(); // Guard DB-D30 được kiểm tra trước mọi thao tác DB.
        $this->assertSame(0, Artisan::call('migrate', ['--force' => true]));
    }

    protected function tearDown(): void
    {
        try {
            DB::table('users')->whereIn('id', $this->userIds)->delete();
            // Khôi phục nullable cả khi test lỗi giữa chừng sau down().
            $migration = require database_path('migrations/'.self::MIGRATION.'.php');
            $migration->up();
            Artisan::call('migrate', ['--force' => true]);
        } finally {
            parent::tearDown();
        }
    }

    public function test_up_and_down_preserve_existing_user_data_and_unique_indexes(): void
    {
        $user = User::factory()->create();
        $this->userIds[] = $user->id;
        $before = (array) DB::table('users')->where('id', $user->id)->first();
        $indexes = Schema::getIndexes('users');

        $this->assertSame(0, Artisan::call('migrate:rollback', ['--step' => 1, '--force' => true]));
        $this->assertFalse(DB::table('migrations')->where('migration', self::MIGRATION)->exists());
        $this->assertSame('NO', $this->emailNullability());
        $this->assertSame($before, (array) DB::table('users')->where('id', $user->id)->first());
        $this->assertSame($indexes, Schema::getIndexes('users'));

        $this->assertSame(0, Artisan::call('migrate', ['--force' => true]));
        $this->assertSame('YES', $this->emailNullability());
        $this->assertSame($before, (array) DB::table('users')->where('id', $user->id)->first());
        $this->assertSame($indexes, Schema::getIndexes('users'));
    }

    public function test_rollback_refuses_null_emails_without_changing_data_or_migration_history(): void
    {
        foreach (['a@example.com', null, null] as $email) {
            $this->userIds[] = User::factory()->unverified()->create(['email' => $email])->id;
        }
        $before = DB::table('users')->whereIn('id', $this->userIds)->orderBy('id')->get()->toArray();
        $indexes = Schema::getIndexes('users');
        $history = DB::table('migrations')->orderBy('id')->get()->toArray();

        try {
            Artisan::call('migrate:rollback', ['--step' => 1, '--force' => true]);
            $this->fail('Rollback phải bị chặn khi còn email NULL');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('còn tài khoản có email NULL', $e->getMessage());
        }

        $this->assertSame('YES', $this->emailNullability());
        $this->assertEquals($before, DB::table('users')->whereIn('id', $this->userIds)->orderBy('id')->get()->toArray());
        $this->assertSame(2, DB::table('users')->whereIn('id', $this->userIds)->whereNull('email')->count());
        $this->assertSame($indexes, Schema::getIndexes('users'));
        $this->assertEquals($history, DB::table('migrations')->orderBy('id')->get()->toArray());
    }

    public function test_successful_rollback_rejects_null_email_again(): void
    {
        $this->assertSame(0, Artisan::call('migrate:rollback', ['--step' => 1, '--force' => true]));

        try {
            $user = User::factory()->unverified()->create(['email' => null]);
            $this->userIds[] = $user->id;
            $this->fail('NOT NULL phải từ chối email NULL sau rollback');
        } catch (QueryException $e) {
            $this->assertSame(1048, $e->errorInfo[1] ?? null, $e->getMessage());
        }
    }

    private function emailNullability(): string
    {
        return DB::selectOne(
            "select IS_NULLABLE as nullable from information_schema.COLUMNS
             where TABLE_SCHEMA = database() and TABLE_NAME = 'users' and COLUMN_NAME = 'email'",
        )->nullable;
    }
}
