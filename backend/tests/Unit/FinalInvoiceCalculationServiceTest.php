<?php

namespace Tests\Unit;

use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Enums\MeterReadingKind;
use App\Enums\ServiceBillingType;
use App\Models\Contract;
use App\Models\ContractService;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\MeterReading;
use App\Models\Service;
use App\Services\FinalInvoiceCalculationService;
use Illuminate\Support\Collection;
use PHPUnit\Framework\TestCase;

class FinalInvoiceCalculationServiceTest extends TestCase
{
    public function test_prorates_room_and_recurring_service_until_exclusive_handover_date(): void
    {
        $service = new Service(['name' => 'Internet', 'unit' => 'phòng']);
        $service->id = 8;
        $service->billing_type = ServiceBillingType::PerRoom;
        $subscription = new ContractService(['quantity' => '1.00', 'unit_price' => 100000, 'start_date' => '2026-10-01']);
        $subscription->id = 12;
        $subscription->service_id = $service->id;
        $subscription->setRelation('service', $service);

        $result = $this->calculator()->calculate($this->contract(), '2026-10-15', '2026-10-01',
            new Collection([$subscription]), new Collection, new Collection, $this->finalMeters(), 0, []);

        $this->assertSame(1445161, $result['amount']);
        $this->assertSame(['rent', 'service'], array_column($result['items'], 'item_type'));
        $this->assertSame(1400000, $result['items'][0]['amount']);
        $this->assertSame(45161, $result['items'][1]['amount']);
    }

    public function test_same_day_handover_can_produce_a_zero_invoice_without_fake_items(): void
    {
        $result = $this->calculator()->calculate($this->contract(), '2026-10-01', '2026-10-01',
            new Collection, new Collection, new Collection, $this->finalMeters(), 0, []);

        $this->assertSame(0, $result['amount']);
        $this->assertSame([], $result['items']);
    }

    public function test_adds_only_valid_calculated_closure_fee_and_damage_snapshots(): void
    {
        $result = $this->calculator()->calculate($this->contract(), '2026-10-01', '2026-10-01',
            new Collection, new Collection, new Collection, $this->finalMeters(), 250000, [[
                'description' => 'Thay mặt kính', 'reason' => 'Kính vỡ khi bàn giao', 'basis' => 'Báo giá BV-12',
                'amount' => 500000, 'attachment_ids' => [77],
            ]]);

        $this->assertSame(750000, $result['amount']);
        $this->assertSame(['termination_fee', 'damage'], array_column($result['items'], 'item_type'));
        $this->assertSame([77], $result['items'][1]['meta']['attachment_ids']);
    }

    public function test_caps_issued_month_unused_period_credit_at_zero_and_reports_external_refund(): void
    {
        $invoice = new Invoice(['type' => InvoiceType::Monthly, 'period' => '2026-10-01']);
        $invoice->id = 30;
        $invoice->status = InvoiceStatus::Issued;
        $invoice->setRelation('items', new Collection([new InvoiceItem([
            'item_type' => 'rent', 'description' => 'Tiền phòng 10/2026', 'quantity' => '1.00', 'unit_price' => 3100000,
            'amount' => 3100000, 'meta' => ['source' => 'generated', 'start_date' => '2026-10-01',
                'end_date_exclusive' => '2026-11-01', 'days_in_month' => 31],
        ])]));

        $result = $this->calculator()->calculate($this->contract(), '2026-10-15', '2026-10-01',
            new Collection, new Collection, new Collection([$invoice]), $this->finalMeters(), 0, []);

        $this->assertSame(0, $result['amount']);
        $this->assertSame([], $result['items']);
        $this->assertSame(1700000, $result['refund_outside_system_amount']);
    }

    public function test_bills_only_unlinked_periodic_meter_usage_and_preserves_the_reading_snapshot(): void
    {
        $contract = $this->contract();
        $contract->id = 5;
        $contract->room_id = 7;
        $service = new Service(['name' => 'Điện', 'unit' => 'kWh']);
        $service->id = 3;
        $service->code = Service::CODE_ELECTRICITY;
        $service->billing_type = ServiceBillingType::Metered;
        $reading = new MeterReading(['room_id' => 7, 'service_id' => 3, 'period' => '2026-10-01', 'reading_date' => '2026-10-31',
            'current_reading' => '210.00']);
        $reading->id = 19;
        $reading->contract_id = 5;
        $reading->kind = MeterReadingKind::Periodic;
        $reading->previous_reading = '200.00';
        $reading->consumption = '10.00';
        $reading->unit_price = 3500;
        $reading->amount = 35000;
        $reading->setRelation('service', $service);

        $result = $this->calculator()->calculate($contract, '2026-11-15', '2026-11-01', new Collection,
            new Collection([$reading]), new Collection, $this->finalMeters(), 0, []);

        $electricity = collect($result['items'])->firstWhere('item_type', 'electricity');
        $this->assertSame(35000, $electricity['amount']);
        $this->assertSame(19, $electricity['meta']['meter_reading_id']);
        $this->assertSame(4581667, $result['amount']);

        $reading->invoice_id = 99;
        $alreadyBilled = $this->calculator()->calculate($contract, '2026-11-15', '2026-11-01', new Collection,
            new Collection([$reading]), new Collection, $this->finalMeters(), 0, []);
        $this->assertSame(0, collect($alreadyBilled['items'])->whereIn('item_type', ['electricity', 'water'])->count());
        $this->assertSame(4546667, $alreadyBilled['amount']);
    }

    public function test_cancelled_monthly_history_cannot_hide_the_live_invoice_and_charge_rent_twice(): void
    {
        $live = new Invoice(['type' => InvoiceType::Monthly, 'period' => '2026-10-01']);
        $live->id = 30;
        $live->status = InvoiceStatus::Issued;
        $live->setRelation('items', new Collection([new InvoiceItem([
            'item_type' => 'rent', 'description' => 'Tiền phòng 10/2026', 'quantity' => '1.00', 'unit_price' => 3100000,
            'amount' => 3100000, 'meta' => ['source' => 'generated', 'start_date' => '2026-10-01',
                'end_date_exclusive' => '2026-11-01', 'days_in_month' => 31],
        ])]));
        $cancelled = new Invoice(['type' => InvoiceType::Monthly, 'period' => '2026-10-01']);
        $cancelled->id = 31;
        $cancelled->status = InvoiceStatus::Cancelled;

        foreach ([[$live, $cancelled], [$cancelled, $live]] as $history) {
            $result = $this->calculator()->calculate($this->contract(), '2026-10-15', '2026-10-01',
                new Collection, new Collection, new Collection($history), $this->finalMeters(), 0, []);
            $this->assertSame(0, $result['amount']);
            $this->assertSame(1700000, $result['refund_outside_system_amount']);
            $this->assertSame([], $result['items']);
        }
    }

    private function calculator(): FinalInvoiceCalculationService
    {
        return new FinalInvoiceCalculationService;
    }

    private function contract(): Contract
    {
        return new Contract(['start_date' => '2026-10-01', 'end_date' => '2027-09-30', 'monthly_rent' => 3100000]);
    }

    /** @return array<int, array<string, mixed>> */
    private function finalMeters(): array
    {
        return [
            ['id' => 101, 'service_code' => 'ELECTRICITY', 'service_name' => 'Điện', 'unit' => 'kWh',
                'consumption' => '0.00', 'previous_reading' => '100.00', 'current_reading' => '100.00', 'unit_price' => 3500, 'amount' => 0],
            ['id' => 102, 'service_code' => 'WATER', 'service_name' => 'Nước', 'unit' => 'm³',
                'consumption' => '0.00', 'previous_reading' => '20.00', 'current_reading' => '20.00', 'unit_price' => 20000, 'amount' => 0],
        ];
    }
}
