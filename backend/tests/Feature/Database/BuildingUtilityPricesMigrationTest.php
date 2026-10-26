<?php

namespace Tests\Feature\Database;

use App\Models\Building;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

/** Explicit pending ALTER tests only. No RefreshDatabase around MySQL DDL. */
class BuildingUtilityPricesMigrationTest extends TestCase
{
    private const PATH = 'migrations/pending/2026_10_27_000002_scope_utility_prices_to_buildings.php';

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasColumn('utility_prices', 'building_id'), 'Pending U1 must not run with default migrate.');
        $this->assertSame(0, DB::table('utility_prices')->count(), 'Không đổi dữ liệu giá ngoài fixture của test này.');
    }

    public function test_copies_every_legacy_price_to_each_existing_building_without_changing_issued_invoice(): void
    {
        $migration = require database_path(self::PATH);
        $buildings = Building::factory()->count(2)->create();
        $service = Service::factory()->metered('U1_TEST_POWER', 'kWh')->create();
        $contract = Contract::factory()->active()->create(['room_id' => Room::factory()->create(['building_id' => $buildings[0]->id])->id]);
        $invoice = Invoice::factory()->issued()->create(['contract_id' => $contract->id, 'total_amount' => 1234567]);
        $invoiceBefore = (array) DB::table('invoices')->where('id', $invoice->id)->first();
        $old = [];
        foreach (['2026-10-01' => 3500, '2026-11-01' => 4000] as $date => $price) {
            $id = DB::table('utility_prices')->insertGetId(['service_id' => $service->id, 'unit_price' => $price,
                'effective_from' => $date, 'created_at' => '2026-09-01 00:00:00', 'updated_at' => null]);
            $old[] = (array) DB::table('utility_prices')->where('id', $id)->first();
        }
        $newBuilding = null;
        $upCompleted = false;
        try {
            $migration->up();
            $upCompleted = true;
            $this->assertSame(count($old) * Building::count(), DB::table('utility_prices')->count());
            foreach (Building::all() as $building) {
                foreach ($old as $original) {
                    $copy = (array) DB::table('utility_prices')->where('building_id', $building->id)
                        ->where('service_id', $service->id)->where('effective_from', $original['effective_from'])->first();
                    foreach (['service_id', 'unit_price', 'effective_from', 'created_at', 'updated_at'] as $field) {
                        $this->assertSame($original[$field], $copy[$field]);
                    }
                }
            }
            $this->assertSame($invoiceBefore, (array) DB::table('invoices')->where('id', $invoice->id)->first());
            try {
                DB::table('utility_prices')->insert(['building_id' => $buildings[0]->id, 'service_id' => $service->id, 'unit_price' => 1, 'effective_from' => '2026-10-01']);
                $this->fail('Không được trùng giá cùng tòa/dịch vụ/ngày hiệu lực.');
            } catch (QueryException $exception) {
                $this->assertSame('23000', (string) $exception->getCode());
            }
            $newBuilding = Building::factory()->create();
            $this->assertFalse(DB::table('utility_prices')->where('building_id', $newBuilding->id)->exists());
            $newBuilding->delete();
            $newBuilding = null;

            $target = DB::table('utility_prices')->where('building_id', $buildings[1]->id)->where('effective_from', '2026-10-01')->value('id');
            DB::table('utility_prices')->where('id', $target)->update(['unit_price' => 7777]);
            $diverged = DB::table('utility_prices')->orderBy('id')->get()->toArray();
            try {
                $migration->down();
                $this->fail('Không được rollback làm mất giá riêng đã thay đổi.');
            } catch (RuntimeException $exception) {
                $this->assertStringContainsString('không tự rollback', $exception->getMessage());
                $this->assertEquals($diverged, DB::table('utility_prices')->orderBy('id')->get()->toArray());
                $this->assertTrue(Schema::hasColumn('utility_prices', 'building_id'));
            }
            DB::table('utility_prices')->where('id', $target)->update(['unit_price' => 3500]);
            $migration->down();
            $this->assertFalse(Schema::hasColumn('utility_prices', 'building_id'));
            $this->assertSame($old, DB::table('utility_prices')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all());
            $this->assertSame($invoiceBefore, (array) DB::table('invoices')->where('id', $invoice->id)->first());
        } finally {
            $newBuilding?->delete();
            if ($upCompleted && Schema::hasColumn('utility_prices', 'building_id')
                && in_array('uq_utility_price_building_service_date', array_column(Schema::getIndexes('utility_prices'), 'name'), true)) {
                // Remove only this fixture's prices, then restore the original schema.
                DB::table('utility_prices')->where('service_id', $service->id)->delete();
                $migration->down();
            }
            DB::table('utility_prices')->where('service_id', $service->id)->delete();
            DB::table('invoices')->where('id', $invoice->id)->delete();
            DB::table('contracts')->where('id', $contract->id)->delete();
            Room::whereKey($contract->room_id)->delete();
            User::whereKey($contract->user_id)->delete();
            Building::whereIn('id', $buildings->modelKeys())->delete();
            $service->delete();
        }
    }

    public function test_orphaned_global_history_requires_mapping_before_any_schema_or_data_change(): void
    {
        $this->assertSame(0, Building::count(), 'Case này cần DB test không có tòa.');
        $service = Service::factory()->metered('U1_ORPHAN_TEST', 'kWh')->create();
        $id = DB::table('utility_prices')->insertGetId(['service_id' => $service->id, 'unit_price' => 3500, 'effective_from' => '2026-10-01']);
        $before = DB::table('utility_prices')->where('id', $id)->first();
        try {
            $migration = require database_path(self::PATH);
            $migration->up();
            $this->fail('Phải có ánh xạ lịch sử trước ALTER.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('cần ánh xạ', $exception->getMessage());
            $this->assertFalse(Schema::hasColumn('utility_prices', 'building_id'));
            $this->assertEquals($before, DB::table('utility_prices')->where('id', $id)->first());
        } finally {
            DB::table('utility_prices')->where('id', $id)->delete();
            $service->delete();
        }
    }
}
