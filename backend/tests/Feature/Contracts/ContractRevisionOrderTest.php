<?php

namespace Tests\Feature\Contracts;

use App\Models\Contract;
use App\Models\ContractService;
use App\Models\Service;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Hồi quy nghiệm thu E2E 04/11: dịch vụ định kỳ lưu lúc nháp (id nhỏ) rồi Điện/Nước thêm lúc kích hoạt; lazy load không
 * ORDER BY trả theo index service_id nên revision tính ở Service khác bản GET và lập hóa đơn tất toán luôn bị 409.
 */
class ContractRevisionOrderTest extends TestCase
{
    use DatabaseTransactions;

    public function test_lifecycle_revision_does_not_depend_on_relation_load_order(): void
    {
        $electricity = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $water = Service::factory()->metered('WATER', 'm3')->create();
        $internet = Service::factory()->create();
        $contract = Contract::factory()->active()->create();
        // Thứ tự id ngược với thứ tự service_id, giống luồng UI thật.
        foreach ([[$internet, '1.00', 100000], [$electricity, '1.00', null], [$water, '1.00', null]] as [$service, $quantity, $price]) {
            ContractService::forceCreate(['contract_id' => $contract->id, 'service_id' => $service->id, 'quantity' => $quantity,
                'unit_price' => $price, 'start_date' => $contract->start_date->format('Y-m-d')]);
        }

        $ordered = Contract::with(['contractServices' => fn ($lines) => $lines->orderBy('id'), 'occupants'])->findOrFail($contract->id);
        $expected = $ordered->lifecycleRevision();
        $reversed = Contract::with('occupants')->findOrFail($contract->id);
        $reversed->setRelation('contractServices', $ordered->contractServices->reverse()->values());

        $this->assertSame($expected, $reversed->lifecycleRevision());
        $this->assertSame($expected, Contract::findOrFail($contract->id)->lifecycleRevision());
    }
}
