<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\ContractService as Subscription;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithContractSettlement;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ContractFutureServicesSettlementTest extends TestCase
{
    use InteractsWithContractSettlement, InteractsWithSpaCookies;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-10-30 08:00:00 UTC');
        $this->prepareSettlementSchema();
        DB::beginTransaction();
        Storage::fake('private');
        $this->initializeSpaClient();
        $this->admin = User::factory()->role(UserRole::Admin)->create(['password' => 'Future services test only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $this->admin->phone, 'password' => 'Future services test only!42'])->assertOk();
    }

    protected function tearDown(): void
    {
        try {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            $this->restoreSettlementSchema();
        } finally {
            CarbonImmutable::setTestNow();
            parent::tearDown();
        }
    }

    private function serviceLine(Contract $contract, string $start): Subscription
    {
        $service = Service::factory()->create(['price' => 100000]);

        return $contract->contractServices()->create(['service_id' => $service->id, 'quantity' => '1.00',
            'unit_price' => 100000, 'start_date' => $start]);
    }

    public static function futureStarts(): array
    {
        return ['after handover' => ['2026-11-01'], 'handover day is excluded' => ['2026-10-30']];
    }

    #[DataProvider('futureStarts')]
    public function test_termination_removes_only_unused_scheduled_line_and_keeps_financial_history(string $start): void
    {
        [$contract, $invoice] = $this->settlementFixture($this->admin);
        $history = $contract->contractServices->pluck('id')->all();
        $future = $this->serviceLine($contract, $start);
        $items = InvoiceItem::orderBy('id')->get()->map->getRawOriginal()->all();
        $url = '/api/v1/contracts/'.$contract->id;
        $preview = $this->spa('GET', $url.'/settlement-preview')->assertOk()->json('data');
        $this->assertTrue($preview['can_terminate']);
        $closed = $this->spa('POST', $url.'/terminate', ['confirmed' => true, 'expected_revision' => $preview['revision']])
            ->assertOk()->assertJsonPath('data.already_terminated', false)->json('data');

        $this->assertDatabaseMissing('contract_services', ['id' => $future->id]);
        $this->assertSame($history, $contract->fresh()->contractServices->pluck('id')->all());
        $this->assertSame($items, InvoiceItem::orderBy('id')->get()->map->getRawOriginal()->all());
        $this->assertSame(2900000, $invoice->fresh()->paid_amount);
        $this->assertSame(1, Payment::count());
        $this->assertSame($closed['revision'], $this->spa('GET', $url.'/settlement-preview')->assertOk()->json('data.revision'));
        $this->spa('POST', $url.'/terminate', ['confirmed' => true, 'expected_revision' => $preview['revision']])
            ->assertOk()->assertJsonPath('data.already_terminated', true);
        $this->assertSame(1, Payment::count());
    }

    public static function referenceStates(): array
    {
        $cases = [];
        foreach (['draft', 'issued', 'paid', 'cancelled'] as $status) {
            foreach ([false, true] as $stringId) {
                $cases[$status.($stringId ? ' string id' : ' numeric id')] = [$status, $stringId];
            }
        }

        return $cases;
    }

    /** Snapshot only business tables; session refreshes are expected during authenticated requests. */
    private function businessSnapshot(): array
    {
        $snapshot = [];
        foreach (['contracts', 'contract_services', 'rooms', 'invoices', 'invoice_items', 'payments'] as $table) {
            $snapshot[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }

        return $snapshot;
    }

    #[DataProvider('referenceStates')]
    public function test_any_invoice_reference_blocks_cleanup_without_writing(string $status, bool $stringId): void
    {
        [$contract] = $this->settlementFixture($this->admin);
        $future = $this->serviceLine($contract, '2026-11-01');
        $amount = $status === 'issued' ? 1 : 0;
        $reference = Invoice::factory()->create(['contract_id' => $contract->id, 'period' => '2026-11-01',
            'status' => $status, 'total_amount' => $amount, 'paid_amount' => 0,
            'issued_at' => $status === 'draft' ? null : now(), 'due_date' => '2026-11-10',
            'cancel_reason' => $status === 'cancelled' ? 'Lịch sử kiểm thử đã hủy.' : null]);
        $reference->items()->create(['item_type' => 'service', 'description' => 'Snapshot lịch sử cần bảo toàn',
            'quantity' => '1.00', 'unit_price' => $amount, 'amount' => $amount,
            'meta' => ['contract_service_id' => $stringId ? (string) $future->id : $future->id]]);
        $before = $this->businessSnapshot();
        $url = '/api/v1/contracts/'.$contract->id;
        $preview = $this->spa('GET', $url.'/settlement-preview')->assertOk()->json('data');

        $this->assertFalse($preview['can_terminate']);
        $this->assertContains('Dịch vụ kỳ sau chưa sử dụng đã được hóa đơn tham chiếu; cần đối chiếu trước khi thanh lý.', $preview['blockers']);
        $this->spa('POST', $url.'/terminate', ['confirmed' => true, 'expected_revision' => $preview['revision']])->assertConflict();
        $this->assertSame($before, $this->businessSnapshot());
    }

    public function test_reference_added_after_preview_is_checked_again_even_on_another_contract(): void
    {
        [$contract] = $this->settlementFixture($this->admin);
        $future = $this->serviceLine($contract, '2026-11-01');
        $url = '/api/v1/contracts/'.$contract->id;
        $preview = $this->spa('GET', $url.'/settlement-preview')->assertOk()->json('data');
        $this->assertTrue($preview['can_terminate']);
        $foreign = Invoice::factory()->cancelled()->create();
        $foreign->items()->create(['item_type' => 'service', 'description' => 'Tham chiếu lịch sử khác hợp đồng',
            'quantity' => '1.00', 'unit_price' => 0, 'amount' => 0, 'meta' => ['contract_service_id' => $future->id]]);
        $before = $this->businessSnapshot();

        $this->spa('POST', $url.'/terminate', ['confirmed' => true, 'expected_revision' => $preview['revision']])->assertConflict();
        $this->assertSame($before, $this->businessSnapshot());
    }

    public function test_same_day_original_periodic_and_metered_snapshots_are_retained(): void
    {
        [$contract] = $this->settlementFixture($this->admin, 0, sameDay: true);
        $original = $this->serviceLine($contract, $contract->start_date->format('Y-m-d'));
        $ids = $contract->fresh()->contractServices->pluck('id')->all();
        $url = '/api/v1/contracts/'.$contract->id;
        $preview = $this->spa('GET', $url.'/settlement-preview')->assertOk()->json('data');
        $this->spa('POST', $url.'/terminate', ['confirmed' => true, 'expected_revision' => $preview['revision']])->assertOk();

        $this->assertSame($ids, $contract->fresh()->contractServices->pluck('id')->all());
        $this->assertSame(100000, $original->fresh()->unit_price);
        $this->assertSame(0, Payment::count());
    }

    public function test_failed_future_line_delete_rolls_back_deposit_invoice_and_room_changes(): void
    {
        [$contract] = $this->settlementFixture($this->admin);
        $this->serviceLine($contract, '2026-11-01');
        $url = '/api/v1/contracts/'.$contract->id;
        $preview = $this->spa('GET', $url.'/settlement-preview')->assertOk()->json('data');
        $before = $this->businessSnapshot();
        $event = 'eloquent.deleting: '.Subscription::class;
        Event::listen($event, fn () => DB::statement('INSERT INTO future_service_failure_probe_missing_table (id) VALUES (1)'));
        try {
            $this->spa('POST', $url.'/terminate', ['confirmed' => true, 'expected_revision' => $preview['revision']])
                ->assertStatus(500)->assertJsonPath('message', 'Không thể đối soát hợp đồng lúc này. Vui lòng thử lại sau.');
            $this->assertSame($before, $this->businessSnapshot());
        } finally {
            Event::forget($event);
        }
    }
}
