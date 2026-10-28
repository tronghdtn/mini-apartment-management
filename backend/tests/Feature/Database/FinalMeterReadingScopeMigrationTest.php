<?php

namespace Tests\Feature\Database;

use App\Models\Contract;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

/** MySQL DDL is outside transactions; exact fixture IDs are cleaned before down(). */
class FinalMeterReadingScopeMigrationTest extends TestCase
{
    private const PATH = 'migrations/pending/2026_10_28_000001_scope_final_meter_readings_to_contracts.php';

    private Room $room;

    private Service $service;

    private array $contracts = [];

    private array $readings = [];

    private array $extraRooms = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasColumn('meter_readings', 'final_contract_id'), 'U3 must remain explicit-path pending.');
        $this->assertSame(0, DB::table('meter_readings')->count(), 'Another fixture owner exists.');
        $this->service = Service::factory()->metered('U3_TEST_POWER', 'kWh')->create();
        $this->room = Room::factory()->create();
        $this->contracts = Contract::factory()->terminated()->count(2)->create(['room_id' => $this->room->id])->all();
    }

    protected function tearDown(): void
    {
        try {
            DB::table('meter_readings')->whereIn('id', $this->readings)->delete();
            if (Schema::hasColumn('meter_readings', 'final_contract_id')) {
                $this->migration()->down();
            }
            $userIds = array_map(fn ($contract) => $contract->user_id, $this->contracts);
            DB::table('contracts')->whereIn('id', array_map(fn ($contract) => $contract->id, $this->contracts))->delete();
            User::whereKey($userIds)->delete();
            Room::whereKey($this->extraRooms)->delete();
            $building = $this->room->building;
            $this->room->delete();
            $building->delete();
            $this->service->delete();
        } finally {
            parent::tearDown();
        }
    }

    private function migration(): object
    {
        return require database_path(self::PATH);
    }

    private function reading(array $overrides = []): MeterReading
    {
        $reading = MeterReading::factory()->create([
            'room_id' => $this->room->id, 'service_id' => $this->service->id, ...$overrides,
        ]);
        $this->readings[] = $reading->id;

        return $reading;
    }

    public function test_keeps_history_and_supports_multiple_closures_in_same_room_month_with_periodic(): void
    {
        $periodic = $this->reading(['contract_id' => $this->contracts[0]->id]);
        $final = $this->reading(['kind' => 'final', 'contract_id' => $this->contracts[0]->id]);
        $before = DB::table('meter_readings')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        $this->migration()->up();
        foreach ($before as $row) {
            $after = (array) DB::table('meter_readings')->find($row['id']);
            foreach ($row as $key => $value) {
                $this->assertSame($value, $after[$key], $key);
            }
        }
        $this->assertSame($this->contracts[0]->id, DB::table('meter_readings')->where('id', $periodic->id)->value('periodic_contract_id'));
        $this->assertNull(DB::table('meter_readings')->where('id', $periodic->id)->value('periodic_vacant_room_id'));
        $this->assertNull(DB::table('meter_readings')->where('id', $periodic->id)->value('final_contract_id'));
        $this->assertSame($this->contracts[0]->id, DB::table('meter_readings')->where('id', $final->id)->value('final_contract_id'));
        $this->reading(['kind' => 'final', 'contract_id' => $this->contracts[1]->id, 'reading_date' => '2026-10-20']);
        $this->reading(['contract_id' => $this->contracts[1]->id]);
        $this->assertSame(4, MeterReading::where('room_id', $this->room->id)->count());
        $snapshot = DB::table('meter_readings')->orderBy('id')->get()->toArray();
        try {
            $this->migration()->down();
            $this->fail('Unsafe rollback must be refused.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('không tự rollback', $exception->getMessage());
        }
        $this->assertEquals($snapshot, DB::table('meter_readings')->orderBy('id')->get()->toArray());
        $this->assertTrue(Schema::hasColumn('meter_readings', 'final_contract_id'));
    }

    public function test_prevents_duplicate_periodic_and_duplicate_final_even_in_another_period(): void
    {
        $this->migration()->up();
        $this->reading(['contract_id' => $this->contracts[0]->id]);
        $this->reading(['kind' => 'final', 'contract_id' => $this->contracts[0]->id]);
        foreach ([['contract_id' => $this->contracts[0]->id], ['kind' => 'final', 'contract_id' => $this->contracts[0]->id, 'period' => '2026-11-01']] as $duplicate) {
            try {
                $this->reading($duplicate);
                $this->fail('Duplicate must fail at DB boundary.');
            } catch (QueryException $exception) {
                $this->assertSame('23000', (string) $exception->getCode());
                $this->assertSame(1062, $exception->errorInfo[1]);
            }
        }
        $this->assertSame(2, MeterReading::count());
    }

    public function test_final_cannot_bypass_unique_with_null_contract_but_vacancy_periodic_is_allowed(): void
    {
        $this->migration()->up();
        $vacancy = $this->reading(['contract_id' => null]);
        $this->assertSame($this->room->id, DB::table('meter_readings')->where('id', $vacancy->id)->value('periodic_vacant_room_id'));
        try {
            $this->reading(['contract_id' => null]);
            $this->fail('Vacancy periodic duplicate must fail.');
        } catch (QueryException $exception) {
            $this->assertSame(1062, $exception->errorInfo[1]);
        }
        try {
            $this->reading(['kind' => 'final', 'contract_id' => null]);
            $this->fail('Final requires a contract.');
        } catch (QueryException $exception) {
            $this->assertSame(3819, $exception->errorInfo[1]);
        }
        $this->assertSame(1, MeterReading::count());
    }

    public function test_generated_keys_preserve_varchar_kind_and_all_history_foreign_keys(): void
    {
        $this->migration()->up();
        $columns = collect(Schema::getColumns('meter_readings'))->keyBy('name');
        $this->assertSame('varchar(20)', $columns['kind']['type']);
        foreach (['periodic_vacant_room_id', 'periodic_contract_id', 'final_contract_id'] as $name) {
            $this->assertTrue($columns[$name]['nullable']);
            $this->assertSame('stored', $columns[$name]['generation']['type']);
        }
        $indexes = collect(Schema::getIndexes('meter_readings'))->keyBy('name');
        $this->assertSame(['periodic_vacant_room_id', 'service_id', 'period'], $indexes['uq_meter_periodic_vacancy_service_period']['columns']);
        $this->assertSame(['periodic_contract_id', 'service_id', 'period'], $indexes['uq_meter_periodic_contract_service_period']['columns']);
        $this->assertSame(['final_contract_id', 'service_id'], $indexes['uq_meter_final_contract_service']['columns']);
        $this->assertTrue($indexes['uq_meter_final_contract_service']['unique']);
        $this->assertArrayNotHasKey('meter_readings_room_id_service_id_period_kind_unique', $indexes);
        $foreigns = collect(Schema::getForeignKeys('meter_readings'))->keyBy(fn ($foreign) => $foreign['columns'][0]);
        $this->assertCount(4, $foreigns);
        foreach (['room_id', 'contract_id', 'service_id', 'invoice_id'] as $column) {
            $this->assertSame('restrict', $foreigns[$column]['on_delete']);
        }
    }

    public static function invalidLegacyFinals(): array
    {
        return ['missing contract' => ['missing'], 'wrong room' => ['wrong_room'], 'duplicate closure across months' => ['duplicate']];
    }

    #[DataProvider('invalidLegacyFinals')]
    public function test_refuses_ambiguous_legacy_history_before_ddl(string $case): void
    {
        $this->reading(['kind' => 'final', 'contract_id' => $case === 'missing' ? null : $this->contracts[0]->id]);
        if ($case === 'wrong_room') {
            // Both contracts are owned fixtures; restoring the room is unnecessary for teardown.
            DB::table('contracts')->where('id', $this->contracts[0]->id)->update(['room_id' => $this->otherRoom()->id]);
        } elseif ($case === 'duplicate') {
            $this->reading(['kind' => 'final', 'contract_id' => $this->contracts[0]->id, 'period' => '2026-11-01']);
        }
        $before = DB::table('meter_readings')->orderBy('id')->get()->toArray();
        try {
            $this->migration()->up();
            $this->fail('Ambiguous legacy history must stop migration.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('cần đối chiếu', $exception->getMessage());
        }
        $this->assertFalse(Schema::hasColumn('meter_readings', 'periodic_vacant_room_id'));
        $this->assertFalse(Schema::hasColumn('meter_readings', 'periodic_contract_id'));
        $this->assertFalse(Schema::hasColumn('meter_readings', 'final_contract_id'));
        $this->assertEquals($before, DB::table('meter_readings')->orderBy('id')->get()->toArray());
    }

    private function otherRoom(): Room
    {
        // Same building avoids an extra parent fixture; tracked by a test-owned room ID.
        $room = Room::factory()->create(['building_id' => $this->room->building_id]);
        $this->extraRooms[] = $room->id;

        return $room;
    }

    public function test_safe_down_restores_original_constraint_without_changing_rows(): void
    {
        $this->reading(['kind' => 'final', 'contract_id' => $this->contracts[0]->id]);
        $this->reading(['period' => '2026-11-01']);
        $before = DB::table('meter_readings')->orderBy('id')->get()->toArray();
        $this->migration()->up();
        $this->migration()->down();
        $this->assertEquals($before, DB::table('meter_readings')->orderBy('id')->get()->toArray());
        $this->assertFalse(Schema::hasColumn('meter_readings', 'final_contract_id'));
        try {
            $this->reading(['kind' => 'final', 'contract_id' => $this->contracts[1]->id]);
            $this->fail('Original room/month constraint must be restored.');
        } catch (QueryException $exception) {
            $this->assertSame(1062, $exception->errorInfo[1]);
        }
    }
}
