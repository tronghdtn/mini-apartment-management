<?php

namespace Tests\Feature\Database;

use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/** DDL commits independently in MySQL: deliberately do not use RefreshDatabase. */
class ContractTermsMigrationTest extends TestCase
{
    private const COLUMNS = [
        'early_termination_fee_type', 'early_termination_fee_amount', 'early_termination_fee_multiplier',
        'early_termination_waiver_conditions', 'early_termination_waiver_code', 'early_termination_waived_by',
        'early_termination_waived_at', 'early_termination_waiver_note',
    ];

    public function test_up_and_down_preserve_existing_contracts_without_inventing_signed_terms(): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $migration = require database_path('migrations/2026_10_27_000001_add_termination_terms_to_contracts_table.php');
        $contract = null;
        $confirmer = null;
        $roomId = $buildingId = $tenantId = null;
        try {
            $migration->down();
            foreach (self::COLUMNS as $column) {
                $this->assertFalse(Schema::hasColumn('contracts', $column));
            }
            // Create a legacy contract before the new columns exist, exactly as a real ALTER encounters it.
            $contract = Contract::factory()->create();
            $roomId = $contract->room_id;
            $buildingId = $contract->room->building_id;
            $tenantId = $contract->user_id;
            $original = (array) DB::table('contracts')->where('id', $contract->id)->first();
            $migration->up();
            $after = (array) DB::table('contracts')->where('id', $contract->id)->first();
            foreach (self::COLUMNS as $column) {
                $this->assertArrayHasKey($column, $after);
                $this->assertNull($after[$column]);
                unset($after[$column]);
            }
            $this->assertSame($original, $after);

            $confirmer = User::factory()->create();
            DB::table('contracts')->where('id', $contract->id)->update(['early_termination_waived_by' => $confirmer->id]);
            try {
                DB::table('users')->where('id', $confirmer->id)->delete();
                $this->fail('FK xác nhận phải RESTRICT để giữ lịch sử.');
            } catch (QueryException $exception) {
                $this->assertSame('23000', (string) $exception->getCode());
            }
            DB::table('contracts')->where('id', $contract->id)->update(['early_termination_waived_by' => null]);
            $migration->down();
            $this->assertSame($original, (array) DB::table('contracts')->where('id', $contract->id)->first());
        } finally {
            if (! Schema::hasColumn('contracts', self::COLUMNS[0])) {
                $migration->up();
            }
            $this->assertTrue(Schema::hasColumns('contracts', self::COLUMNS));
            if ($contract !== null) {
                DB::table('contracts')->where('id', $contract->id)->delete();
            }
            if ($roomId !== null) {
                Room::whereKey($roomId)->delete();
                Building::whereKey($buildingId)->delete();
                User::whereKey($tenantId)->delete();
            }
            if ($confirmer !== null) {
                User::whereKey($confirmer->id)->delete();
            }
        }
    }
}
