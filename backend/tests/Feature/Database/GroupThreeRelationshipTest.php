<?php

namespace Tests\Feature\Database;

use App\Enums\InvoiceItemType;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Enums\MeterReadingKind;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\MeterReading;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Quan hệ Eloquent, casts và chặn mass assignment của 4 Model Nhóm 3 (tổng 14 Model / 16 bảng). */
class GroupThreeRelationshipTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_relations_and_casts(): void
    {
        $invoice = Invoice::factory()->issued()->create();
        $item = $invoice->items()->create([
            'item_type' => InvoiceItemType::Discount,
            'description' => 'Hoàn tiền phòng',
            'quantity' => '1',
            'unit_price' => 1700000,
            'amount' => -1700000,
            'meta' => ['days' => 17, 'days_in_month' => 31, 'source' => 'rent'],
        ]);
        $payment = $invoice->payments()->forceCreate(['amount' => 500000, 'method' => PaymentMethod::BankTransfer, 'status' => PaymentStatus::Pending]);

        $invoice = $invoice->fresh();
        $this->assertSame(InvoiceType::Monthly, $invoice->type);
        $this->assertSame(InvoiceStatus::Issued, $invoice->status);
        $this->assertSame('2026-11-01', $invoice->toArray()['period']);
        $this->assertSame(0, $invoice->total_amount);
        $this->assertTrue($invoice->contract->is(Contract::find($invoice->contract_id)));
        $this->assertTrue($invoice->contract->invoices->contains($invoice));
        $this->assertTrue($invoice->items->first()->is($item));
        $this->assertTrue($invoice->payments->first()->is($payment));

        $item = $item->fresh();
        $this->assertSame(-1700000, $item->amount);
        $this->assertSame('1.00', $item->quantity);
        // Cột JSON của MySQL chuẩn hóa và KHÔNG giữ thứ tự khóa: so sánh theo khóa/giá trị, không theo thứ tự.
        $this->assertEquals(['days' => 17, 'days_in_month' => 31, 'source' => 'rent'], $item->meta);
        $this->assertSame(17, $item->meta['days']);
        $this->assertSame(InvoiceItemType::Discount, $item->item_type);
        $this->assertTrue($item->invoice->is($invoice));
    }

    public function test_replacement_chain(): void
    {
        $cancelled = Invoice::factory()->cancelled()->create();
        $replacement = Invoice::factory()->create(['contract_id' => $cancelled->contract_id]);
        DB::table('invoices')->where('id', $replacement->id)->update(['related_invoice_id' => $cancelled->id]);

        $this->assertTrue($replacement->fresh()->relatedInvoice->is($cancelled));
        $this->assertTrue($cancelled->fresh()->replacements->first()->is($replacement));
    }

    public function test_meter_reading_relations_and_casts(): void
    {
        $contract = Contract::factory()->active()->create();
        $reading = MeterReading::factory()->create(['room_id' => $contract->room_id]);
        DB::table('meter_readings')->where('id', $reading->id)->update(['contract_id' => $contract->id]);
        $invoice = Invoice::factory()->create(['contract_id' => $contract->id]);
        DB::table('meter_readings')->where('id', $reading->id)->update(['invoice_id' => $invoice->id]);

        $reading = $reading->fresh();
        $this->assertSame(MeterReadingKind::Periodic, $reading->kind);
        $this->assertSame('112.35', $reading->current_reading);
        $this->assertSame('12.35', $reading->consumption);
        $this->assertSame(43225, $reading->amount);
        $this->assertSame('2026-10-01', $reading->toArray()['period']);
        $this->assertSame('2026-11-01', $reading->toArray()['reading_date']);
        $this->assertTrue($reading->room->is($contract->room));
        $this->assertTrue($reading->contract->is($contract));
        $this->assertTrue($reading->invoice->is($invoice));
        $this->assertTrue($reading->service->isMetered());

        $this->assertTrue($contract->room->meterReadings->contains($reading));
        $this->assertTrue($contract->meterReadings->contains($reading));
        $this->assertTrue($reading->service->meterReadings->contains($reading));
        $this->assertTrue($invoice->meterReadings->contains($reading));
    }

    public function test_payment_relations_and_casts(): void
    {
        $invoice = Invoice::factory()->issued()->create();
        $resident = User::find($invoice->contract->user_id);
        $admin = User::factory()->create();
        $payment = $invoice->payments()->forceCreate([
            'amount' => 1200000,
            'method' => PaymentMethod::Cash,
            'status' => PaymentStatus::Confirmed,
            'receipt_number' => 'RCP-202611-0001',
            'submitted_by' => $resident->id,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ])->fresh();

        $this->assertSame(1200000, $payment->amount);
        $this->assertSame(PaymentMethod::Cash, $payment->method);
        $this->assertSame(PaymentStatus::Confirmed, $payment->status);
        $this->assertTrue($payment->invoice->is($invoice));
        $this->assertTrue($payment->submitter->is($resident));
        $this->assertTrue($payment->reviewer->is($admin));
    }

    public function test_lifecycle_fields_are_not_mass_assignable(): void
    {
        $contract = Contract::factory()->active()->create();

        $invoice = Invoice::create([
            'contract_id' => $contract->id,
            'type' => 'monthly',
            'period' => '2026-11-01',
            'status' => 'paid',
            'invoice_number' => 'INV-FAKE',
            'total_amount' => 999,
            'paid_amount' => 999,
            'live_monthly_contract_id' => 1,
        ])->fresh();
        $this->assertSame(InvoiceStatus::Draft, $invoice->status);
        $this->assertNull($invoice->invoice_number);
        $this->assertSame(0, $invoice->total_amount);
        $this->assertSame(0, $invoice->paid_amount);
        $this->assertSame($contract->id, (int) $invoice->live_monthly_contract_id);

        $payment = new Payment(['amount' => 100, 'method' => 'cash', 'status' => 'confirmed', 'reviewed_by' => 1, 'receipt_number' => 'X']);
        $this->assertNull($payment->status);
        $this->assertNull($payment->reviewed_by);
        $this->assertNull($payment->receipt_number);

        $reading = new MeterReading(['current_reading' => '5', 'kind' => 'final', 'contract_id' => 1, 'amount' => 1, 'invoice_id' => 1, 'previous_reading' => '0']);
        $this->assertNull($reading->kind);
        $this->assertNull($reading->contract_id);
        $this->assertNull($reading->amount);
        $this->assertNull($reading->invoice_id);
        $this->assertNull($reading->previous_reading);
    }
}
