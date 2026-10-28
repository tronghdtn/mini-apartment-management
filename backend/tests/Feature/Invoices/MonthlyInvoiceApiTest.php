<?php

namespace Tests\Feature\Invoices;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class MonthlyInvoiceApiTest extends TestCase
{
    use InteractsWithSpaCookies;
    use RefreshDatabase;

    private Contract $contract;

    private User $owner;

    private User $admin;

    private Service $power;

    private Service $water;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-10-28 08:00:00 UTC');
        $this->initializeSpaClient();
        $this->admin = User::factory()->role(UserRole::Admin)->create(['password' => 'Invoice test only!42']);
        $this->owner = User::factory()->role(UserRole::Resident)->create(['password' => 'Invoice test only!42']);
        $this->contract = Contract::factory()->active()->create(['user_id' => $this->owner->id, 'monthly_rent' => 3100000, 'start_date' => '2026-10-16']);
        $this->power = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $this->water = Service::factory()->metered('WATER', 'm3')->create();
        foreach ([$this->power, $this->water] as $service) {
            $this->contract->contractServices()->create(['service_id' => $service->id, 'quantity' => '1.00', 'unit_price' => null, 'start_date' => '2026-10-16']);
        }
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function login(?User $user = null): void
    {
        $user ??= $this->admin;
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Invoice test only!42'])->assertOk();
    }

    private function create(string $period = '2026-10-01'): array
    {
        return $this->spa('POST', '/api/v1/invoices', ['contract_id' => $this->contract->id, 'period' => $period])->assertCreated()->json('data');
    }

    private function action(array $invoice, string $action, array $data = [])
    {
        return $this->spa('POST', '/api/v1/invoices/'.$invoice['id'].'/'.$action, ['expected_revision' => $invoice['revision'], ...$data]);
    }

    private function meters(string $period = '2026-10-01', bool $zero = false): void
    {
        foreach ([$this->power, $this->water] as $index => $service) {
            DB::table('meter_readings')->insert(['contract_id' => $this->contract->id, 'room_id' => $this->contract->room_id,
                'service_id' => $service->id, 'kind' => 'periodic', 'period' => $period, 'reading_date' => CarbonImmutable::parse($period)->addMonth()->format('Y-m-d'),
                'previous_reading' => $index ? '10.00' : '100.00', 'current_reading' => $index ? ($zero ? '10.00' : '12.35') : ($zero ? '100.00' : '112.35'),
                'consumption' => $zero ? '0.00' : ($index ? '2.35' : '12.35'), 'unit_price' => $index ? 15000 : 3500,
                'amount' => $zero ? 0 : ($index ? 35250 : 43225), 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function test_guest_staff_and_resident_cannot_create_or_read_others_and_csrf_is_real(): void
    {
        $this->spa('GET', '/api/v1/invoices')->assertUnauthorized();
        $this->spa('POST', '/api/v1/invoices', [])->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Guard, UserRole::Technician] as $role) {
            $this->login(User::factory()->role($role)->create(['password' => 'Invoice test only!42']));
            $this->spa('GET', '/api/v1/invoices')->assertForbidden();
            $this->spa('POST', '/api/v1/invoices', [])->assertForbidden();
        }
        $this->login();
        $invoice = $this->create();
        $this->spa('POST', '/api/v1/invoices', ['contract_id' => $this->contract->id, 'period' => '2026-10-01'], sendCsrf: false)->assertStatus(419);
        $this->login($this->owner);
        $this->spa('GET', '/api/v1/invoices')->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/invoices/'.$invoice['id'])->assertForbidden();
        foreach (['issue', 'refresh', 'cancel', 'other-items'] as $action) {
            $this->action($invoice, $action)->assertForbidden();
        }
    }

    public function test_first_month_prorates_snapshots_issues_and_remains_readable_after_termination(): void
    {
        $service = Service::factory()->create(['price' => 999999]);
        $service->billing_type = 'per_person';
        $service->save();
        $this->contract->contractServices()->create(['service_id' => $service->id, 'quantity' => '2.00', 'unit_price' => 31000, 'start_date' => '2026-10-16']);
        $this->login();
        $invoice = $this->create();
        $this->assertSame(1632000, $invoice['total_amount']); // 16/31 rent and two-person service snapshot, not catalog999999.
        $this->assertSame('draft', $invoice['status']);
        $this->assertNull($invoice['invoice_number']);
        $this->assertCount(2, $invoice['items']);
        $issued = $this->action($invoice, 'issue')->assertOk()->json('data');
        $this->assertSame('issued', $issued['status']);
        $this->assertSame('2026-11-02', $issued['due_date']);
        $this->assertStringStartsWith('INV-202610-', $issued['invoice_number']);
        $this->action($issued, 'refresh')->assertConflict();
        $this->spa('POST', '/api/v1/invoices/'.$issued['id'].'/other-items', ['expected_revision' => $issued['revision'], 'description' => 'Không sửa issued', 'amount' => 1, 'basis' => 'Test'])->assertConflict();
        DB::table('contracts')->where('id', $this->contract->id)->update(['status' => 'terminated', 'actual_end_date' => '2026-10-29']);
        $this->login($this->owner);
        $this->spa('GET', '/api/v1/invoices')->assertOk()->assertJsonCount(1, 'data');
        $this->spa('GET', '/api/v1/invoices/'.$issued['id'])->assertOk()->assertJsonPath('data.total_amount', 1632000)->assertJsonMissingPath('data.manual_history');
        $other = User::factory()->role(UserRole::Resident)->create(['password' => 'Invoice test only!42']);
        $this->login($other);
        $this->spa('GET', '/api/v1/invoices')->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/invoices/'.$issued['id'])->assertForbidden();
    }

    public function test_other_charges_require_basis_preserve_audit_and_stale_revision_cannot_overwrite(): void
    {
        $this->login();
        $invoice = $this->create();
        $url = '/api/v1/invoices/'.$invoice['id'].'/other-items';
        $this->spa('POST', $url, ['expected_revision' => $invoice['revision'], 'description' => 'Khoản đã thỏa thuận', 'amount' => 100000])->assertUnprocessable()->assertJsonValidationErrors('basis');
        $added = $this->spa('POST', $url, ['expected_revision' => $invoice['revision'], 'description' => 'Khoản đã thỏa thuận', 'amount' => 100000, 'basis' => 'Thỏa thuận bổ sung đã xác nhận'])->assertOk()->json('data');
        $itemId = collect($added['items'])->firstWhere('item_type', 'other')['id'];
        $this->assertCount(1, $added['manual_history'][0]['audit']);
        $this->spa('PATCH', "$url/$itemId", ['expected_revision' => $invoice['revision'], 'description' => 'Bản cũ', 'amount' => 1, 'basis' => 'Test'])->assertConflict();
        $updated = $this->spa('PATCH', "$url/$itemId", ['expected_revision' => $added['revision'], 'description' => 'Khoản sửa', 'amount' => 50000, 'basis' => 'Đối chiếu thỏa thuận'])->assertOk()->json('data');
        $this->assertCount(2, $updated['manual_history'][0]['audit']);
        $removed = $this->spa('DELETE', "$url/$itemId", ['expected_revision' => $updated['revision'], 'reason' => 'Thỏa thuận hủy khoản thu'])->assertOk()->json('data');
        $this->assertCount(1, $removed['items']);
        $this->assertTrue($removed['manual_history'][0]['voided']);
        $this->assertCount(3, $removed['manual_history'][0]['audit']);
        $this->assertDatabaseHas('invoice_items', ['id' => $itemId, 'quantity' => '1.00', 'amount' => 0]);
        $this->assertSame(1600000, $removed['total_amount']);
    }

    public function test_future_draft_requires_real_previous_period_readings_and_waits_until_period_to_issue(): void
    {
        $this->login();
        $this->spa('POST', '/api/v1/invoices', ['contract_id' => $this->contract->id, 'period' => '2026-11-01'])->assertUnprocessable()->assertJsonValidationErrors('period');
        $this->assertDatabaseCount('invoices', 0);
        $this->meters();
        $invoice = $this->create('2026-11-01');
        $this->assertSame(3178475, $invoice['total_amount']);
        $this->assertCount(3, $invoice['items']);
        $this->action($invoice, 'issue')->assertConflict();
        CarbonImmutable::setTestNow('2026-10-31 17:00:00 UTC'); // 00:00 VN November1, new real session.
        $this->initializeSpaClient();
        $this->login();
        $issued = $this->action($invoice, 'issue')->assertOk()->json('data');
        $this->assertSame('2026-11-06', $issued['due_date']);
        $this->assertStringStartsWith('INV-202611-', $issued['invoice_number']);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_zero_total_is_paid_without_receipt_or_payment_and_zero_meters_stay_linked(): void
    {
        $this->contract->monthly_rent = 0;
        $this->contract->save();
        $this->meters(zero: true);
        CarbonImmutable::setTestNow('2026-11-01 03:00:00 UTC');
        $this->initializeSpaClient();
        $this->login();
        $invoice = $this->create('2026-11-01');
        $this->assertCount(1, $invoice['items']);
        $this->assertCount(2, $invoice['meter_readings']);
        $this->assertSame(0, $invoice['total_amount']);
        $this->action($invoice, 'issue')->assertOk()->assertJsonPath('data.status', 'paid')->assertJsonPath('data.paid_amount', 0);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_cancel_preserves_history_releases_meters_and_recreation_links_original(): void
    {
        $this->meters();
        $this->login();
        $invoice = $this->create('2026-11-01');
        $this->spa('POST', '/api/v1/invoices', ['contract_id' => $this->contract->id, 'period' => '2026-11-01'])->assertConflict();
        $this->action($invoice, 'cancel', ['reason' => 'Cần đối chiếu và lập lại'])->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertSame(0, DB::table('meter_readings')->where('invoice_id', $invoice['id'])->count());
        $this->assertDatabaseCount('invoice_items', 3);
        $replacement = $this->create('2026-11-01');
        $this->assertSame($invoice['id'], $replacement['related_invoice_id']);
        $this->assertSame(2, DB::table('meter_readings')->where('invoice_id', $replacement['id'])->count());
    }

    public function test_source_change_requires_refresh_and_payments_block_cancellation(): void
    {
        $this->login();
        $invoice = $this->create();
        // Simulates a future approved contract-service edit; the issue action must not silently charge changed data.
        DB::table('contracts')->where('id', $this->contract->id)->update(['monthly_rent' => 6200000]);
        $this->action($invoice, 'issue')->assertConflict();
        $refreshed = $this->action($invoice, 'refresh')->assertOk()->json('data');
        $this->assertSame(3200000, $refreshed['total_amount']);
        $issued = $this->action($refreshed, 'issue')->assertOk()->json('data');
        $payment = new Payment(['amount' => 10000, 'method' => 'bank_transfer']);
        $payment->status = 'pending';
        $payment->invoice_id = $issued['id'];
        $payment->submitted_by = $this->owner->id;
        $payment->save();
        $this->action($issued, 'cancel', ['reason' => 'Không được hủy pending'])->assertConflict();
        $payment->status = 'confirmed';
        $payment->save();
        $this->action($issued, 'cancel', ['reason' => 'Cần điều chỉnh'])->assertConflict();
    }

    public function test_forged_fields_invalid_dates_numbers_and_missing_other_item_are_rejected(): void
    {
        $this->login();
        foreach ([['period' => '2026-10-02'], ['period' => '2026-02-30'], ['contract_id' => true], ['total_amount' => 1], ['type' => 'final']] as $bad) {
            $this->spa('POST', '/api/v1/invoices', ['contract_id' => $this->contract->id, 'period' => '2026-10-01', ...$bad])->assertUnprocessable();
        }
        $invoice = $this->create();
        foreach ([0, -1, 1.5, true, 9007199254740992] as $amount) {
            $this->spa('POST', '/api/v1/invoices/'.$invoice['id'].'/other-items', ['expected_revision' => $invoice['revision'], 'description' => 'Test', 'basis' => 'Căn cứ', 'amount' => $amount])->assertUnprocessable();
        }
        $this->spa('PATCH', '/api/v1/invoices/'.$invoice['id'].'/other-items/999999', ['expected_revision' => $invoice['revision'], 'description' => 'Test', 'basis' => 'Căn cứ', 'amount' => 1])->assertConflict();
        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_monthly_actions_do_not_rewrite_adjustment_or_final_drafts(): void
    {
        $this->login();
        foreach (['adjustment', 'final'] as $type) {
            $invoice = Invoice::factory()->create(['contract_id' => $this->contract->id, 'type' => $type, 'period' => '2026-10-01']);
            $before = $invoice->fresh()->getRawOriginal();
            $detail = $this->spa('GET', '/api/v1/invoices/'.$invoice->id)->assertOk()->json('data');
            $this->action($detail, 'refresh')->assertConflict();
            $this->action($detail, 'issue')->assertConflict();
            $this->assertSame($before, $invoice->fresh()->getRawOriginal());
        }
    }

    public function test_issue_refuses_unknown_or_unjustified_manual_charges(): void
    {
        $this->login();
        $invoice = $this->create();
        $item = Invoice::findOrFail($invoice['id'])->items()->create(['item_type' => 'other', 'description' => 'Dữ liệu cũ thiếu căn cứ',
            'quantity' => '1.00', 'unit_price' => 1000, 'amount' => 1000, 'meta' => ['source' => 'manual']]);
        $detail = $this->spa('GET', '/api/v1/invoices/'.$invoice['id'])->assertOk()->json('data');
        $this->action($detail, 'issue')->assertConflict();
        $item->meta = ['source' => 'unknown'];
        $item->save();
        $detail = $this->spa('GET', '/api/v1/invoices/'.$invoice['id'])->assertOk()->json('data');
        $this->action($detail, 'issue')->assertConflict();
        $this->assertDatabaseHas('invoices', ['id' => $invoice['id'], 'status' => 'draft', 'invoice_number' => null]);
    }

    public function test_refresh_preserves_manual_basis_and_resident_can_read_it_after_issue(): void
    {
        $this->login();
        $invoice = $this->create();
        $added = $this->spa('POST', '/api/v1/invoices/'.$invoice['id'].'/other-items', ['expected_revision' => $invoice['revision'],
            'description' => 'Khoản đã thỏa thuận', 'amount' => 100000, 'basis' => 'Phụ lục hợp đồng đã xác nhận'])->assertOk()->json('data');
        $refreshed = $this->action($added, 'refresh')->assertOk()->json('data');
        $this->assertSame($added['manual_history'], $refreshed['manual_history']);
        $issued = $this->action($refreshed, 'issue')->assertOk()->json('data');
        $this->login($this->owner);
        $this->spa('GET', '/api/v1/invoices/'.$issued['id'])->assertOk()->assertJsonFragment(['basis' => 'Phụ lục hợp đồng đã xác nhận'])
            ->assertJsonMissingPath('data.manual_history')->assertJsonPath('data.revision', null);
    }

    public function test_zero_invoice_can_be_cancelled_and_replaced_without_fake_money_under_d27(): void
    {
        $this->contract->monthly_rent = 0;
        $this->contract->save();
        $this->login();
        $issued = $this->action($this->create(), 'issue')->assertOk()->json('data');
        $this->assertSame('paid', $issued['status']);
        $this->action($issued, 'cancel', ['reason' => 'Sai kỳ, lập lại theo DB-D27'])->assertOk()->assertJsonPath('data.status', 'cancelled');
        $replacement = $this->create();
        $this->assertSame($issued['id'], $replacement['related_invoice_id']);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_active_past_scheduled_end_keeps_billing_and_leap_month_proration_is_exact(): void
    {
        $this->contract->start_date = '2024-02-15';
        $this->contract->end_date = '2024-02-20';
        $this->contract->monthly_rent = 2900000;
        $this->contract->save();
        $this->login();
        $invoice = $this->create('2024-02-01');
        $this->assertSame(1500000, $invoice['total_amount']);
        $this->assertSame(15, $invoice['items'][0]['calculation']['active_days']);
        $this->assertSame(29, $invoice['items'][0]['calculation']['days_in_month']);
    }
}
