<?php

namespace Tests\Feature\Debts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class DebtApiTest extends TestCase
{
    use InteractsWithSpaCookies;
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-10-28 08:00:00 UTC');
        $this->initializeSpaClient();
        $this->admin = User::factory()->role(UserRole::Admin)->create(['password' => 'Debt test only!42']);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function login(User $user): void
    {
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Debt test only!42'])->assertOk();
    }

    private function debtInvoice(Contract $contract, int $total, int $paid, string $dueDate, string $status = 'issued', string $period = '2026-11-01'): Invoice
    {
        return Invoice::factory()->create([
            'contract_id' => $contract->id,
            'status' => $status,
            'total_amount' => $total,
            'paid_amount' => $paid,
            'due_date' => $dueDate,
            'period' => $period,
            'invoice_number' => 'INV-TEST-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'issued_at' => now(),
        ]);
    }

    private function payment(Invoice $invoice, int $amount, string $status): void
    {
        DB::table('payments')->insert([
            'invoice_id' => $invoice->id,
            'amount' => $amount,
            'method' => 'bank_transfer',
            'status' => $status,
            'submitted_by' => $invoice->contract->user_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_only_active_admin_can_read_debts(): void
    {
        $this->spa('GET', '/api/v1/debts')->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $user = User::factory()->role($role)->create(['password' => 'Debt test only!42']);
            $this->login($user);
            $this->spa('GET', '/api/v1/debts')->assertForbidden();
        }

        $locked = User::factory()->role(UserRole::Admin)->locked()->create(['password' => 'Debt test only!42']);
        $this->actingAs($locked);
        $this->spa('GET', '/api/v1/debts')->assertForbidden();
    }

    public function test_groups_real_outstanding_by_contract_and_keeps_terminated_history(): void
    {
        $resident = User::factory()->role(UserRole::Resident)->create();
        $contract = Contract::factory()->terminated()->create(['user_id' => $resident->id, 'contract_number' => 'HD-DEBT-ONE']);
        $overdue = $this->debtInvoice($contract, 1000, 300, '2026-10-27', 'partially_paid', '2026-08-01');
        $upcoming = $this->debtInvoice($contract, 2000, 0, '2026-11-01', 'issued', '2026-09-01');
        $this->payment($overdue, 600, 'pending');
        $this->payment($overdue, 300, 'confirmed');
        $this->debtInvoice($contract, 5000, 0, '2026-10-01', 'cancelled', '2026-07-01');
        $this->debtInvoice($contract, 6000, 0, '2026-10-01', 'draft', '2026-10-01');
        $this->debtInvoice($contract, 7000, 7000, '2026-10-01', 'paid', '2026-06-01');
        $zero = $this->debtInvoice($contract, 0, 0, '2026-10-01', 'issued', '2026-05-01');

        $contract->delete();
        $this->login($this->admin);
        $response = $this->spa('GET', '/api/v1/debts')->assertOk();
        $response->assertJsonPath('summary.total_outstanding', '2700')
            ->assertJsonPath('summary.overdue_outstanding', '700')
            ->assertJsonPath('summary.invoice_count', 2)
            ->assertJsonPath('summary.debtor_count', 1)
            ->assertJsonPath('data.0.contract_id', $contract->id)
            ->assertJsonPath('data.0.contract_status', 'terminated')
            ->assertJsonPath('data.0.outstanding_amount', '2700')
            ->assertJsonPath('data.0.overdue_amount', '700')
            ->assertJsonPath('data.0.invoice_count', 2)
            ->assertJsonPath('data.0.invoices.0.id', $overdue->id)
            ->assertJsonPath('data.0.invoices.0.outstanding_amount', 700)
            ->assertJsonPath('data.0.invoices.0.is_overdue', true)
            ->assertJsonPath('data.0.invoices.1.id', $upcoming->id)
            ->assertJsonPath('data.0.invoices.1.is_overdue', false);
        $this->assertNotSame($zero->id, $response->json('data.0.invoices.0.id'));
        $this->assertSame(2, count($response->json('data.0.invoices')));
    }

    public function test_tabs_filter_contract_groups_by_vietnamese_due_date_while_summary_stays_global(): void
    {
        $oldResident = User::factory()->role(UserRole::Resident)->create();
        $old = Contract::factory()->terminated()->create(['user_id' => $oldResident->id]);
        $this->debtInvoice($old, 1200, 200, '2026-10-27', 'partially_paid');
        $futureResident = User::factory()->role(UserRole::Resident)->create();
        $future = Contract::factory()->active()->create(['user_id' => $futureResident->id]);
        $this->debtInvoice($future, 2000, 0, '2026-10-28'); // Due today is not overdue.

        $this->login($this->admin);
        $this->spa('GET', '/api/v1/debts?status=overdue')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.contract_id', $old->id)
            ->assertJsonPath('summary.total_outstanding', '3000')
            ->assertJsonPath('summary.overdue_outstanding', '1000');
        $this->spa('GET', '/api/v1/debts?status=not_due')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.contract_id', $future->id)
            ->assertJsonPath('summary.debtor_count', 2);
    }

    public function test_pagination_keeps_global_totals_exact_and_invoice_filter_keeps_contract_scope(): void
    {
        $contract = Contract::factory()->terminated()->create();
        $first = $this->debtInvoice($contract, 9007199254740991, 0, '2026-11-01', 'issued', '2026-09-01');
        $second = $this->debtInvoice($contract, 9007199254740991, 0, '2026-11-01', 'issued', '2026-10-01');
        foreach (range(1, 20) as $index) {
            $this->debtInvoice(Contract::factory()->terminated()->create(), 1, 0, '2026-11-01');
        }
        $this->login($this->admin);
        $this->spa('GET', '/api/v1/debts?page=2')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 21)
            ->assertJsonPath('data.0.contract_id', $contract->id)
            ->assertJsonPath('data.0.outstanding_amount', '18014398509481982')
            ->assertJsonPath('summary.total_outstanding', '18014398509482002');
        $response = $this->spa('GET', '/api/v1/invoices?contract_id='.$contract->id)->assertOk();
        $this->assertEqualsCanonicalizing([$first->id, $second->id], array_column($response->json('data'), 'id'));
        $this->spa('GET', '/api/v1/debts?page=3')->assertOk()->assertJsonCount(0, 'data')
            ->assertJsonPath('summary.total_outstanding', '18014398509482002');
    }

    public function test_search_is_literal_and_unknown_or_invalid_filters_are_rejected(): void
    {
        $resident = User::factory()->role(UserRole::Resident)->create(['full_name' => 'Pham 100%_A\\B']);
        $contract = Contract::factory()->terminated()->create(['user_id' => $resident->id, 'contract_number' => 'HD-LITERAL-100%_A\\B']);
        $this->debtInvoice($contract, 5000, 0, '2026-11-01');
        $otherResident = User::factory()->role(UserRole::Resident)->create(['full_name' => 'Pham 100XXA/B']);
        $other = Contract::factory()->terminated()->create(['user_id' => $otherResident->id, 'contract_number' => 'HD-OTHER']);
        $this->debtInvoice($other, 9000, 0, '2026-11-01');

        $this->login($this->admin);
        $this->spa('GET', '/api/v1/debts?search='.rawurlencode('100%_A\\B'))->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.contract_id', $contract->id);
        $this->spa('GET', '/api/v1/debts?status=overdue-ish')->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->spa('GET', '/api/v1/debts?page=0')->assertUnprocessable()->assertJsonValidationErrors('page');
        $this->spa('GET', '/api/v1/debts?unexpected=1')->assertUnprocessable()->assertJsonValidationErrors('unexpected');
    }
}
