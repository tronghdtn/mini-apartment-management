<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DepositRefundSchemaTest extends TestCase
{
    public function test_nullable_audit_preserves_history_fk_and_refuses_destructive_rollback(): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertSame(0, User::count(), 'Committed schema fixtures require an empty protected test DB.');
        $migration = require database_path('migrations/pending/2026_11_02_100001_add_deposit_refund_confirmation_to_contracts_table.php');
        $tenant = $admin = $contract = $room = null;
        $applied = false;
        try {
            $tenant = User::factory()->create();
            $admin = User::factory()->role(UserRole::Admin)->create();
            $contract = Contract::factory()->create(['user_id' => $tenant->id]);
            $room = $contract->room;
            $before = $contract->fresh()->getRawOriginal();
            $migration->up();
            $applied = true;
            $this->assertTrue(Schema::hasColumns('contracts', ['deposit_refunded_at', 'deposit_refunded_by']));
            $after = $contract->fresh()->getRawOriginal();
            $this->assertNull($after['deposit_refunded_at']);
            $this->assertNull($after['deposit_refunded_by']);
            unset($after['deposit_refunded_at'],$after['deposit_refunded_by']);
            $this->assertSame($before, $after);
            $columns = collect(DB::select("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contracts'"))->keyBy('COLUMN_NAME');
            $this->assertSame('YES', $columns['deposit_refunded_at']->IS_NULLABLE);
            $this->assertSame('timestamp', $columns['deposit_refunded_at']->COLUMN_TYPE);
            $this->assertSame('YES', $columns['deposit_refunded_by']->IS_NULLABLE);
            $this->assertSame('bigint unsigned', $columns['deposit_refunded_by']->COLUMN_TYPE);
            // With no audit yet, rollback must preserve the existing user/contract data.
            $migration->down();
            $applied = false;
            $this->assertSame($before, $contract->fresh()->getRawOriginal());
            $migration->up();
            $applied = true;
            DB::table('contracts')->where('id', $contract->id)->update(['deposit_refunded_at' => now(), 'deposit_refunded_by' => $admin->id]);
            try {
                $admin->delete();
                $this->fail('Reviewer FK must protect history');
            } catch (QueryException $e) {
                $this->assertSame(1451, $e->errorInfo[1]);
            }
            try {
                $migration->down();
                $this->fail('Rollback must not erase recorded refunds');
            } catch (\RuntimeException $e) {
                $this->assertStringContainsString('đã có xác nhận hoàn cọc', $e->getMessage());
            }
            $this->assertTrue(Schema::hasColumn('contracts', 'deposit_refunded_at'));
            $this->assertSame($admin->id, $contract->fresh()->deposit_refunded_by);
        } finally {
            if ($contract) {
                DB::table('contracts')->where('id', $contract->id)->delete();
            }
            if ($room) {
                $building = $room->building;
                $room->delete();
                $building->delete();
            }
            foreach ([$tenant, $admin] as $user) {
                if ($user) {
                    $user->delete();
                }
            }
            if ($applied) {
                $migration->down();
            }
        }
        $this->assertFalse(Schema::hasColumn('contracts', 'deposit_refunded_at'));
        $this->assertSame(0,User::count());
    }
}
