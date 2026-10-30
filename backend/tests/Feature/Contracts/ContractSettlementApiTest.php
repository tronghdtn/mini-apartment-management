<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Payment;
use App\Models\Room;
use App\Models\User;
use App\Services\ContractService;
use App\Services\ContractSettlementService;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithContractSettlement;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ContractSettlementApiTest extends TestCase
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
        $this->admin = User::factory()->role(UserRole::Admin)->create(['password' => 'Settlement test only!42']);
        $this->login($this->admin);
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

    private function login(User $user): void
    {
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Settlement test only!42'])->assertOk();
    }

    private function preview(Contract $contract): array
    {
        return $this->spa('GET', '/api/v1/contracts/'.$contract->id.'/settlement-preview')->assertOk()->json('data');
    }

    private function terminate(Contract $contract, ?array $preview = null): TestResponse
    {
        return $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/terminate', ['confirmed' => true, 'expected_revision' => ($preview ?? $this->preview($contract))['revision']]);
    }

    public static function deposits(): array
    {
        return ['exact' => [2900000, 2900000, 0, '0'], 'insufficient' => [1000000, 1000000, 0, '1900000'],
            'surplus still owed' => [5000000, 2900000, 2100000, '0'], 'zero' => [0, 0, 0, '2900000']];
    }

    #[DataProvider('deposits')]
    public function test_held_deposit_is_applied_once_and_remaining_debt_or_refund_is_preserved(int $held, int $deducted, int $refund, string $debt): void
    {
        [$contract, $invoice, $owner] = $this->settlementFixture($this->admin, $held);
        $before = DB::table('invoice_items')->where('invoice_id', $invoice->id)->get()->toArray();
        $preview = $this->preview($contract);
        $this->assertTrue($preview['can_terminate']);
        $this->assertSame($deducted, $preview['deposit_deducted_amount']);
        $this->assertSame($refund, $preview['deposit_refund_amount']);
        $this->assertSame($debt, $preview['outstanding_after']);
        $this->assertSame(0, Payment::count()); // GET never allocates actual money.
        $response = $this->terminate($contract, $preview)->assertOk()->assertJsonPath('data.status', 'terminated')
            ->assertJsonPath('data.room_status', 'available')->assertJsonPath('data.refund_recording', 'unpaid_obligation')
            ->assertJsonPath('data.already_terminated', false)->json('data');
        $this->assertSame($refund, $response['deposit_refund_amount']);
        $this->assertSame($debt, $response['outstanding_amount']);
        $saved = $contract->fresh();
        $this->assertSame('2026-10-30', $saved->actual_end_date->format('Y-m-d'));
        $this->assertNotNull($saved->closed_at);
        $this->assertSame('settled', $saved->deposit_status->value);
        $this->assertSame('resident', $owner->fresh()->role->value);
        $this->assertFalse($owner->fresh()->hasActiveContract());
        $this->assertTrue($saved->contractServices->every(fn ($line) => $line->end_date->format('Y-m-d') === '2026-10-29'));
        $this->assertEquals($before, DB::table('invoice_items')->where('invoice_id', $invoice->id)->get()->toArray());
        $this->assertSame($deducted > 0 ? 1 : 0, Payment::count());
        if ($deducted > 0) {
            $payment = Payment::sole();
            $this->assertSame('deposit', $payment->method->value);
            $this->assertSame('confirmed', $payment->status->value);
            $this->assertSame($deducted, $payment->amount);
            $this->assertSame($this->admin->id, $payment->reviewed_by);
            $this->assertMatchesRegularExpression('/^RCP-\d{6}-\d{4,}$/', $payment->receipt_number);
        }
        $this->terminate($contract, $preview)->assertOk()->assertJsonPath('data.already_terminated', true);
        $this->assertSame($deducted > 0 ? 1 : 0, Payment::count());
    }

    public function test_deposit_follows_due_date_and_id_and_does_not_erase_historical_confirmed_money(): void
    {
        [$contract, $final, , $monthly] = $this->settlementFixture($this->admin, 5000000, 'arrears');
        DB::table('invoices')->where('id', $monthly[1])->update(['due_date' => '2026-08-09']);
        $byDate = $this->preview($contract);
        $this->assertSame([$monthly[1], $monthly[0], $final->id], array_column($byDate['invoices'], 'id'));
        $this->assertSame([3100000, 1900000, 0], array_column($byDate['invoices'], 'deposit_applied'));
        DB::table('invoices')->whereIn('id', $monthly)->update(['due_date' => '2026-09-10']);
        $preview = $this->preview($contract);
        $this->assertSame([...$monthly, $final->id], array_column($preview['invoices'], 'id'));
        $this->assertSame([2500000, 2500000, 0], array_column($preview['invoices'], 'deposit_applied'));
        $this->assertSame('8500000', $preview['outstanding_amount']);
        $this->terminate($contract, $preview)->assertOk()->assertJsonPath('data.outstanding_amount', '3500000');
        $this->assertDatabaseHas('payments', ['invoice_id' => $monthly[0], 'method' => 'cash', 'amount' => 600000, 'status' => 'confirmed']);
        $this->assertSame(2, Payment::where('method', 'deposit')->count());
    }

    public function test_pending_blocks_even_when_confirmed_money_or_deposit_covers_debt_and_rejected_does_not_count(): void
    {
        [$contract, $invoice] = $this->settlementFixture($this->admin);
        $owner = $contract->tenant;
        $pending = app(PaymentService::class)->store($invoice, $owner, ['amount' => 400000], UploadedFile::fake()->createWithContent('proof.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII=')));
        $preview = $this->preview($contract);
        $this->assertFalse($preview['can_terminate']);
        $this->assertSame(1, $preview['pending_payment_count']);
        $this->assertSame('2900000', $preview['outstanding_amount']);
        $this->terminate($contract, $preview)->assertConflict();
        $this->assertSame(0, $invoice->fresh()->paid_amount);
        $this->assertSame('held', $contract->fresh()->deposit_status->value);
        $this->assertSame('occupied', $contract->room->fresh()->status->value);
        $this->spa('POST', '/api/v1/payments/'.$pending->id.'/reject', ['expected_revision' => $pending->revision(), 'reject_reason' => 'Minh chứng chưa khớp trong kiểm thử.'])->assertOk();
        $this->terminate($contract, $preview)->assertConflict(); // Rejected state also invalidates the old snapshot.
        $this->terminate($contract)->assertOk()->assertJsonPath('data.deposit_deducted_amount', 2900000);
        $this->assertSame(2900000, $invoice->fresh()->paid_amount);
        $this->assertSame('rejected', $pending->fresh()->status->value);
    }

    public function test_same_day_zero_final_and_unreceived_deposit_create_no_fake_payment(): void
    {
        [$contract, $invoice] = $this->settlementFixture($this->admin, 0, sameDay: true);
        $this->assertSame(0, $invoice->total_amount);
        $contract->forceFill(['deposit_amount' => 1000000])->save(); // Legacy unreceived deposit must never be spent.
        $this->terminate($contract)->assertOk()->assertJsonPath('data.held_amount', 0)->assertJsonPath('data.deposit_refund_amount', 0);
        $this->assertSame(0, Payment::count());
        $this->assertSame('2026-10-29', $contract->fresh()->contractServices->first()->end_date->format('Y-m-d'));
        $this->assertSame('2026-10-30', $contract->fresh()->actual_end_date->format('Y-m-d'));
        $current = app(InvoiceService::class)->find($invoice->id);
        $this->spa('POST', '/api/v1/invoices/'.$invoice->id.'/cancel', ['expected_revision' => $current->revision(), 'reason' => 'Không được phá kết quả thanh lý'])->assertConflict();
    }

    public function test_deposit_never_subtracts_damage_or_termination_fee_twice(): void
    {
        [$contract, $invoice] = $this->settlementFixture($this->admin, 3200000, damaged: true);
        $this->assertSame(3100000, $invoice->total_amount);
        $this->terminate($contract)->assertOk()->assertJsonPath('data.deposit_deducted_amount', 3100000)->assertJsonPath('data.deposit_refund_amount', 100000);
        $this->assertSame(3100000, $invoice->fresh()->total_amount);
    }

    public function test_external_unused_day_refund_is_separate_from_surplus_deposit(): void
    {
        [$contract, $invoice] = $this->settlementFixture($this->admin, 1000000, 'prepaid');
        $this->assertSame(0, $invoice->total_amount);
        $this->assertStringContainsString('200.000 VND; chưa xác nhận đã hoàn.', $contract->closure_note);
        $this->terminate($contract)->assertOk()->assertJsonPath('data.deposit_deducted_amount', 0)->assertJsonPath('data.deposit_refund_amount', 1000000);
        $this->assertSame(0, Payment::where('method', 'deposit')->count());
    }

    public function test_money_change_invalidates_preview_and_ledger_corruption_is_not_ignored(): void
    {
        [$contract, $invoice] = $this->settlementFixture($this->admin);
        $preview = $this->preview($contract);
        app(PaymentService::class)->store($invoice, $this->admin, ['amount' => 100000, 'method' => 'cash', 'confirmed_received' => true, 'expected_revision' => $invoice->revision()]);
        $this->terminate($contract, $preview)->assertConflict();
        $this->assertSame('active', $contract->fresh()->status->value);
        DB::table('invoices')->where('id', $invoice->id)->update(['paid_amount' => 200000]);
        $this->spa('GET', '/api/v1/contracts/'.$contract->id.'/settlement-preview')->assertConflict();
        $this->assertSame(0, Payment::where('method', 'deposit')->count());
    }

    public function test_replay_never_frees_room_after_a_new_contract_has_activated_and_old_debt_remains_payable(): void
    {
        [$contract, $invoice, $owner] = $this->settlementFixture($this->admin, 0);
        $preview = $this->preview($contract);
        $this->terminate($contract, $preview)->assertOk();
        $next = Contract::factory()->create(['room_id' => $contract->room_id, 'user_id' => $owner->id, 'start_date' => '2026-10-30', 'end_date' => '2027-10-29',
            'monthly_rent' => 3100000, 'deposit_amount' => 0, 'early_termination_fee_type' => 'none']);
        $next = app(ContractService::class)->find($next->id);
        app(ContractService::class)->activate($next, $this->admin, ['initial_electricity_reading' => '100.00', 'initial_water_reading' => '10.00',
            'meter_gap_confirmed' => false, 'expected_revision' => $next->lifecycleRevision()]);
        $this->terminate($contract, $preview)->assertOk()->assertJsonPath('data.room_status', 'occupied');
        $this->assertSame('active', $next->fresh()->status->value);
        app(PaymentService::class)->store($invoice->fresh(), $this->admin, ['amount' => 100000, 'method' => 'cash',
            'confirmed_received' => true, 'expected_revision' => $invoice->fresh()->revision()]);
        $this->assertSame(100000, $invoice->fresh()->paid_amount);
        $this->assertSame('resident', $owner->fresh()->role->value);
    }

    public function test_permission_csrf_validation_and_draft_state_never_mutate(): void
    {
        [$contract] = $this->settlementFixture($this->admin);
        $preview = $this->preview($contract);
        foreach (['password', 'remember_token', 'id_number', 'tenant', 'email', 'phone'] as $sensitive) {
            $this->assertArrayNotHasKey($sensitive, $preview);
        }
        $url = '/api/v1/contracts/'.$contract->id.'/terminate';
        $data = ['confirmed' => true, 'expected_revision' => $preview['revision']];
        $this->spa('POST', $url, $data, sendCsrf: false)->assertStatus(419);
        foreach ([[], [...$data, 'confirmed' => false], [...$data, 'deposit_amount' => 1], [...$data, 'status' => 'terminated'], [...$data, 'role' => 'admin']] as $bad) {
            $this->spa('POST', $url, $bad)->assertUnprocessable();
        }
        $this->spa('POST', $url, [...$data, 'expected_revision' => str_repeat('a', 64)])->assertConflict();
        $this->spa('POST', '/api/v1/contracts/999999999/terminate', $data)->assertNotFound();
        $draft = Contract::factory()->create();
        $this->spa('GET', '/api/v1/contracts/'.$draft->id.'/settlement-preview')->assertConflict();
        $this->spa('POST', '/api/v1/contracts/'.$draft->id.'/terminate', $data)->assertConflict();
        $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
        $this->spa('GET', '/api/v1/contracts/'.$contract->id.'/settlement-preview')->assertUnauthorized();
        $this->spa('POST', $url, $data)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $user = User::factory()->role($role)->create(['password' => 'Settlement test only!42']);
            $this->login($user);
            $this->spa('GET', '/api/v1/contracts/'.$contract->id.'/settlement-preview')->assertForbidden();
            $this->spa('POST', $url, $data)->assertForbidden();
            $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
        }
        $this->login($this->admin);
        DB::table('users')->where('id', $this->admin->id)->update(['status' => 'locked']);
        $this->spa('GET', '/api/v1/contracts/'.$contract->id.'/settlement-preview')->assertForbidden();
        $this->spa('POST', $url, $data)->assertUnauthorized(); // The first rejection also invalidates the locked account's session.
        $this->assertSame('active', $contract->fresh()->status->value);
        $this->assertSame(0, Payment::count());
        $this->assertSame(0, DB::table('notifications')->where('type', 'contract.terminated')->count());
    }

    public function test_unissued_final_and_changed_monthly_source_block_closure(): void
    {
        [$contract, $final, , $monthly] = $this->settlementFixture($this->admin, 3000000, 'arrears');
        $invoices = app(InvoiceService::class);
        $source = $invoices->find($monthly[1]);
        $invoices->cancel($source, ['expected_revision' => $source->revision(), 'reason' => 'Kiểm thử thay nguồn đã phát hành.']);
        $preview = $this->preview($contract);
        $this->assertFalse($preview['can_terminate']);
        $this->terminate($contract, $preview)->assertConflict();
        $invoices->cancel($invoices->find($final->id), ['expected_revision' => $invoices->find($final->id)->revision(), 'reason' => 'Lập lại tất toán sau đối chiếu.']);
        $preview = $this->preview($contract);
        $this->assertFalse($preview['can_terminate']);
        $this->terminate($contract, $preview)->assertConflict();
        $this->assertSame(0, Payment::where('method', 'deposit')->count());
    }

    public function test_failure_after_allocation_rolls_back_every_financial_and_room_change(): void
    {
        [$contract, $invoice] = $this->settlementFixture($this->admin);
        $preview = $this->preview($contract);
        $event = 'eloquent.updating: '.Room::class;
        Event::listen($event, function ($room) {
            if ($room->status->value === 'available') {
                throw new \RuntimeException('Simulated room persistence failure.');
            }
        });
        try {
            app(ContractSettlementService::class)->terminate($contract, $this->admin, ['expected_revision' => $preview['revision'], 'confirmed' => true]);
            $this->fail('The room update should fail.');
        } catch (\RuntimeException $failure) {
            $this->assertSame('Simulated room persistence failure.', $failure->getMessage());
        } finally {
            Event::forget($event);
        }
        $this->assertSame('active', $contract->fresh()->status->value);
        $this->assertSame('held', $contract->fresh()->deposit_status->value);
        $this->assertNull($contract->fresh()->closed_at);
        $this->assertSame(0, $invoice->fresh()->paid_amount);
        $this->assertSame(0, Payment::count());
        $this->assertSame('occupied', $contract->room->fresh()->status->value);
        $this->assertSame(0, DB::table('notifications')->where('type', 'contract.terminated')->count());
        $this->terminate($contract, $preview)->assertOk();
    }
}
