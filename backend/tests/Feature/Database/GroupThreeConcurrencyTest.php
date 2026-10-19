<?php

namespace Tests\Feature\Database;

use App\Models\Contract;
use App\Models\Room;
use App\Models\Service;
use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Tranh chấp tạo hóa đơn và ghi chỉ số bằng hai kết nối MySQL thật tới mini_apartment_test (kế hoạch §6.3 C1).
 * Không dùng RefreshDatabase (kết nối thứ hai chỉ thấy dữ liệu đã commit); dọn dữ liệu ở tearDown.
 */
class GroupThreeConcurrencyTest extends TestCase
{
    private const SECOND = 'mysql_test_concurrent';

    private Connection $a;

    private Connection $b;

    private Contract $contract;

    private Service $electricity;

    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate', ['--force' => true]);

        config(['database.connections.'.self::SECOND => config('database.connections.mysql_test')]);
        $this->a = DB::connection();
        $this->b = DB::connection(self::SECOND);
        $this->assertSame('mini_apartment_test', $this->b->selectOne('select database() as db')->db);
        $this->b->statement('SET SESSION innodb_lock_wait_timeout = 1');

        $this->contract = Contract::factory()->active()->create();
        $this->electricity = Service::factory()->metered('ELECTRICITY_CONC', 'kWh')->create();
    }

    protected function tearDown(): void
    {
        foreach ([$this->a, $this->b] as $connection) {
            while ($connection->transactionLevel() > 0) {
                $connection->rollBack();
            }
        }

        $invoiceIds = DB::table('invoices')->where('contract_id', $this->contract->id)->pluck('id');
        DB::table('meter_readings')->where('room_id', $this->contract->room_id)->delete();
        DB::table('invoices')->whereIn('id', $invoiceIds)->whereNotNull('related_invoice_id')->delete();
        DB::table('invoices')->whereIn('id', $invoiceIds)->delete();
        $room = Room::find($this->contract->room_id);
        DB::table('contracts')->where('id', $this->contract->id)->delete();
        DB::table('users')->where('id', $this->contract->user_id)->delete();
        DB::table('rooms')->where('id', $room->id)->delete();
        DB::table('buildings')->where('id', $room->building_id)->delete();
        DB::table('services')->where('id', $this->electricity->id)->delete();
        DB::purge(self::SECOND);

        parent::tearDown();
    }

    public function test_concurrent_monthly_invoice_for_same_contract_and_period(): void
    {
        $this->a->beginTransaction();
        $this->insertInvoice($this->a, 'monthly');

        $this->assertDbError(1205, fn () => $this->insertInvoice($this->b, 'monthly'));
        $this->a->commit();
        $this->assertDbError(1062, fn () => $this->insertInvoice($this->b, 'monthly'));

        $this->assertSame(1, DB::table('invoices')->where('contract_id', $this->contract->id)->count());
    }

    public function test_concurrent_final_invoice_second_succeeds_after_first_rolls_back(): void
    {
        $this->a->beginTransaction();
        $this->insertInvoice($this->a, 'final');
        $this->assertDbError(1205, fn () => $this->insertInvoice($this->b, 'final'));
        $this->a->rollBack();

        $this->insertInvoice($this->b, 'final');
        $this->assertSame(1, DB::table('invoices')->where('contract_id', $this->contract->id)->where('type', 'final')->count());
    }

    public function test_concurrent_cancel_and_reissue_keeps_single_live_invoice(): void
    {
        $original = $this->insertInvoice($this->a, 'monthly');

        // A hủy (chưa commit); B lập lại cùng kỳ phải chờ, A commit thì B lập lại thành công
        $this->a->beginTransaction();
        $this->a->table('invoices')->where('id', $original)->update(['status' => 'cancelled']);
        $this->assertDbError(1205, fn () => $this->insertInvoice($this->b, 'monthly', $original));
        $this->a->commit();

        $this->insertInvoice($this->b, 'monthly', $original);
        $this->assertSame(1, DB::table('invoices')->where('contract_id', $this->contract->id)->whereNotNull('live_monthly_contract_id')->count());
    }

    public function test_concurrent_periodic_reading_for_same_room_service_period(): void
    {
        $this->a->beginTransaction();
        $this->insertReading($this->a);

        $this->assertDbError(1205, fn () => $this->insertReading($this->b));
        $this->a->commit();
        $this->assertDbError(1062, fn () => $this->insertReading($this->b));

        $this->assertSame(1, DB::table('meter_readings')->where('room_id', $this->contract->room_id)->count());
    }

    private function insertInvoice(Connection $connection, string $type, ?int $relatedId = null): int
    {
        return $connection->table('invoices')->insertGetId([
            'contract_id' => $this->contract->id,
            'type' => $type,
            'period' => '2026-11-01',
            'status' => 'draft',
            'related_invoice_id' => $relatedId,
        ]);
    }

    private function insertReading(Connection $connection): int
    {
        return $connection->table('meter_readings')->insertGetId([
            'room_id' => $this->contract->room_id,
            'contract_id' => $this->contract->id,
            'service_id' => $this->electricity->id,
            'kind' => 'periodic',
            'period' => '2026-10-01',
            'reading_date' => '2026-11-01',
            'previous_reading' => '100.00',
            'current_reading' => '110.00',
            'consumption' => '10.00',
            'unit_price' => 3500,
            'amount' => 35000,
        ]);
    }

    private function assertDbError(int $mysqlCode, callable $statement): void
    {
        try {
            $statement();
            $this->fail("Câu lệnh phải bị MySQL chặn với mã {$mysqlCode}");
        } catch (QueryException $e) {
            $this->assertSame($mysqlCode, $e->errorInfo[1] ?? null, $e->getMessage());
        }
    }
}
