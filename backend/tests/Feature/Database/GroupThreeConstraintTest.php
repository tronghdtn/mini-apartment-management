<?php

namespace Tests\Feature\Database;

use App\Models\Contract;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Ràng buộc DB của Nhóm 3: hóa đơn trùng (DB-09), hóa đơn thay thế, discount âm (DB-20), chỉ số trùng, RESTRICT. */
class GroupThreeConstraintTest extends TestCase
{
    use RefreshDatabase;

    private const DUPLICATE = 1062;

    private const ROW_IS_REFERENCED = 1451;

    private const OUT_OF_RANGE = 1264;

    private Contract $contract;

    protected function setUp(): void
    {
        parent::setUp();
        $this->contract = Contract::factory()->active()->create();
    }

    public function test_one_live_monthly_invoice_per_contract_and_period(): void
    {
        // DB-09 ở mức DB
        $this->insertInvoice('monthly', '2026-11-01', 'issued');
        $this->insertInvoice('monthly', '2026-12-01');                              // kỳ khác
        $this->insertInvoice('monthly', '2026-11-01', 'draft', Contract::factory()->active()->create()->id); // hợp đồng khác

        foreach (['draft', 'issued', 'partially_paid', 'paid'] as $status) {
            $this->assertDbError(self::DUPLICATE, fn () => $this->insertInvoice('monthly', '2026-11-01', $status));
        }
    }

    public function test_replacement_invoice_allowed_after_cancel(): void
    {
        // DB-D27: hủy rồi lập lại, liên kết related_invoice_id
        $original = $this->insertInvoice('monthly', '2026-11-01', 'issued');
        DB::table('invoices')->where('id', $original)->update(['status' => 'cancelled', 'cancel_reason' => 'Sai chỉ số nước']);

        $replacement = $this->insertInvoice('monthly', '2026-11-01', 'draft', null, ['related_invoice_id' => $original]);
        $this->assertSame($original, (int) DB::table('invoices')->where('id', $replacement)->value('related_invoice_id'));

        // Hủy tiếp và lập lại lần nữa vẫn được; hai hóa đơn đã hủy cùng kỳ không xung đột
        DB::table('invoices')->where('id', $replacement)->update(['status' => 'cancelled']);
        $this->insertInvoice('monthly', '2026-11-01', 'draft', null, ['related_invoice_id' => $replacement]);
        $this->assertSame(3, DB::table('invoices')->where('contract_id', $this->contract->id)->where('period', '2026-11-01')->count());
        $this->assertSame(1, DB::table('invoices')->where('contract_id', $this->contract->id)->whereNotNull('live_monthly_contract_id')->count());
    }

    public function test_one_live_final_invoice_per_contract_and_adjustment_unrestricted(): void
    {
        $final = $this->insertInvoice('final', '2026-12-01');
        $this->assertDbError(self::DUPLICATE, fn () => $this->insertInvoice('final', '2027-01-01'));

        DB::table('invoices')->where('id', $final)->update(['status' => 'cancelled']);
        $this->insertInvoice('final', '2026-12-01', 'draft', null, ['related_invoice_id' => $final]);

        // Hóa đơn monthly và final cùng kỳ không chặn nhau ở DB (quy tắc "không lập monthly khi đã có final" ở Service)
        $this->insertInvoice('monthly', '2026-12-01');

        // adjustment (SHOULD) không chịu hai unique trên
        $this->insertInvoice('adjustment', '2026-12-01');
        $this->insertInvoice('adjustment', '2026-12-01');
        $this->assertSame(2, DB::table('invoices')->where('type', 'adjustment')->count());
    }

    public function test_invoice_number_unique_and_money_unsigned(): void
    {
        $this->insertInvoice('monthly', '2026-11-01', 'issued', null, ['invoice_number' => 'INV-202611-0001']);
        $this->assertDbError(self::DUPLICATE, fn () => $this->insertInvoice('monthly', '2026-12-01', 'issued', null, ['invoice_number' => 'INV-202611-0001']));

        // DB-20: tổng hóa đơn không âm ở mức DB
        $this->assertDbError(self::OUT_OF_RANGE, fn () => $this->insertInvoice('monthly', '2027-01-01', 'draft', null, ['total_amount' => -1]));
    }

    public function test_invoice_items_store_negative_discount_exactly(): void
    {
        // DB-20: amount có dấu, unit_price không âm
        $invoice = $this->insertInvoice('final', '2026-12-01');
        DB::table('invoice_items')->insert([
            ['invoice_id' => $invoice, 'item_type' => 'rent', 'description' => 'Tiền phòng 01–14/12', 'quantity' => '1', 'unit_price' => 3100000, 'amount' => 1400000],
            ['invoice_id' => $invoice, 'item_type' => 'discount', 'description' => 'Hoàn tiền phòng 15–31/12', 'quantity' => '1', 'unit_price' => 1700000, 'amount' => -1700000],
            ['invoice_id' => $invoice, 'item_type' => 'discount', 'description' => 'Giá trị lớn', 'quantity' => '1', 'unit_price' => 9000000000000000, 'amount' => -9000000000000000],
        ]);

        $this->assertSame([1400000, -1700000, -9000000000000000], DB::table('invoice_items')->where('invoice_id', $invoice)->orderBy('id')->pluck('amount')->map(fn ($v) => (int) $v)->all());
        $this->assertDbError(self::OUT_OF_RANGE, fn () => DB::table('invoice_items')->insert(['invoice_id' => $invoice, 'item_type' => 'discount', 'description' => 'x', 'quantity' => '1', 'unit_price' => -1, 'amount' => -1]));
    }

    public function test_one_periodic_and_one_final_reading_per_room_service_period(): void
    {
        $room = $this->contract->room;
        $electricity = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $water = Service::factory()->metered('WATER', 'm3')->create();

        $this->insertReading($room->id, $electricity->id, 'periodic', '2026-10-01');
        $this->assertDbError(self::DUPLICATE, fn () => $this->insertReading($room->id, $electricity->id, 'periodic', '2026-10-01'));

        // Cho phép: final cùng kỳ, dịch vụ khác, kỳ khác, phòng khác
        $this->insertReading($room->id, $electricity->id, 'final', '2026-10-01');
        $this->insertReading($room->id, $water->id, 'periodic', '2026-10-01');
        $this->insertReading($room->id, $electricity->id, 'periodic', '2026-11-01');
        $this->insertReading(Room::factory()->create()->id, $electricity->id, 'periodic', '2026-10-01');

        // Giới hạn MVP: một final mỗi phòng/dịch vụ/kỳ
        $this->assertDbError(self::DUPLICATE, fn () => $this->insertReading($room->id, $electricity->id, 'final', '2026-10-01'));

        // Phòng trống: contract_id NULL hợp lệ (5 dòng ghi thành công ở trên đều không gắn hợp đồng)
        $this->assertSame(5, DB::table('meter_readings')->whereNull('contract_id')->count());
    }

    public function test_payments_receipt_unique_and_amount_unsigned(): void
    {
        $invoice = $this->insertInvoice('monthly', '2026-11-01', 'issued');
        $this->insertPayment($invoice, ['receipt_number' => 'RCP-202611-0001', 'status' => 'confirmed']);
        $this->insertPayment($invoice);                        // nhiều payment / hóa đơn
        $this->insertPayment($invoice);

        $this->assertDbError(self::DUPLICATE, fn () => $this->insertPayment($invoice, ['receipt_number' => 'RCP-202611-0001', 'status' => 'confirmed']));
        $this->assertDbError(self::OUT_OF_RANGE, fn () => $this->insertPayment($invoice, ['amount' => -1]));
        $this->assertSame(3, DB::table('payments')->where('invoice_id', $invoice)->count());
    }

    public function test_restrict_protects_financial_history(): void
    {
        $electricity = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $reviewer = User::factory()->create();
        $original = $this->insertInvoice('monthly', '2026-10-01', 'cancelled');
        $invoice = $this->insertInvoice('monthly', '2026-11-01', 'issued', null, ['related_invoice_id' => $original]);
        DB::table('invoice_items')->insert(['invoice_id' => $invoice, 'item_type' => 'rent', 'description' => 'x', 'quantity' => '1', 'unit_price' => 1, 'amount' => 1]);
        $reading = $this->insertReading($this->contract->room_id, $electricity->id, 'periodic', '2026-10-01', $this->contract->id);
        DB::table('meter_readings')->where('id', $reading)->update(['invoice_id' => $invoice]);
        $this->insertPayment($invoice, ['status' => 'confirmed', 'reviewed_by' => $reviewer->id, 'submitted_by' => $this->contract->user_id]);

        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('invoices')->where('id', $invoice)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('invoices')->where('id', $original)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('contracts')->where('id', $this->contract->id)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('rooms')->where('id', $this->contract->room_id)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('services')->where('id', $electricity->id)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('users')->where('id', $reviewer->id)->delete());

        // Hủy hóa đơn giải phóng chỉ số bằng cách đặt invoice_id = NULL (không xóa) — được phép
        DB::table('meter_readings')->where('id', $reading)->update(['invoice_id' => null]);
        $this->assertNull(DB::table('meter_readings')->where('id', $reading)->value('invoice_id'));
    }

    /** @param array<string, mixed> $extra */
    private function insertInvoice(string $type, string $period, string $status = 'draft', ?int $contractId = null, array $extra = []): int
    {
        return DB::table('invoices')->insertGetId($extra + [
            'contract_id' => $contractId ?? $this->contract->id,
            'type' => $type,
            'period' => $period,
            'status' => $status,
        ]);
    }

    private function insertReading(int $roomId, int $serviceId, string $kind, string $period, ?int $contractId = null): int
    {
        return DB::table('meter_readings')->insertGetId([
            'room_id' => $roomId,
            'contract_id' => $contractId,
            'service_id' => $serviceId,
            'kind' => $kind,
            'period' => $period,
            'reading_date' => '2026-11-01',
            'previous_reading' => '100.00',
            'current_reading' => '110.00',
            'consumption' => '10.00',
            'unit_price' => 3500,
            'amount' => 35000,
        ]);
    }

    /** @param array<string, mixed> $extra */
    private function insertPayment(int $invoiceId, array $extra = []): int
    {
        return DB::table('payments')->insertGetId($extra + [
            'invoice_id' => $invoiceId,
            'amount' => 500000,
            'method' => 'bank_transfer',
            'status' => 'pending',
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
