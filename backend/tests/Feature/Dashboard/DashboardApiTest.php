<?php

namespace Tests\Feature\Dashboard;

use App\Enums\DepositStatus;
use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\User;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private $migration;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-31 17:05:00 UTC');
        CarbonImmutable::setTestNow('2026-10-31 17:05:00 UTC');
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertSame(0, DB::table('users')->count());
        $this->assertFalse(Schema::hasTable('maintenance_requests'), 'Refusing to use a schema owned by another run.');
        $this->migration = require database_path('migrations/pending/2026_10_14_400017_create_maintenance_requests_table.php');
        $this->migration->up();
        DB::beginTransaction();
        $this->initializeSpaClient();
    }

    protected function tearDown(): void
    {
        try {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            if ($this->migration && Schema::hasTable('maintenance_requests')) {
                $this->migration->down();
            }
            Carbon::setTestNow();
            CarbonImmutable::setTestNow();
        } finally {
            parent::tearDown();
        }
    }

    private function login(UserRole $role = UserRole::Admin, bool $locked = false): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Dashboard tests only!42']);
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Dashboard tests only!42'])->assertOk();
        if ($locked) {
            User::whereKey($user->id)->update(['status' => 'locked']);
        }

        return $user;
    }

    private function invoice(Contract $contract, int $month, array $attributes = []): Invoice
    {
        return Invoice::factory()->create(array_merge([
            'contract_id' => $contract->id, 'period' => CarbonImmutable::parse('2026-01-01')->addMonths($month)->format('Y-m-d'),
            'status' => InvoiceStatus::Issued, 'issued_at' => now(), 'total_amount' => 1000, 'paid_amount' => 0,
        ], $attributes));
    }

    private function payment(Invoice $invoice, int $amount, string $method, string $status, ?string $reviewedAt): void
    {
        // Test-only fixture: API is read-only, no PaymentFactory or production status bypass is added.
        Payment::forceCreate(['invoice_id' => $invoice->id, 'amount' => $amount, 'method' => $method,
            'status' => $status, 'reviewed_at' => $reviewedAt, 'created_at' => '2026-10-01 00:00:00']);
    }

    public function test_only_active_admin_can_read_and_query_cannot_choose_role_scope_or_period(): void
    {
        $this->spa('GET', '/api/v1/dashboard')->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('GET', '/api/v1/dashboard')->assertForbidden();
        }
        $this->login(locked: true);
        $this->spa('GET', '/api/v1/dashboard')->assertForbidden();
        $this->login();
        $this->spa('GET', '/api/v1/dashboard?period=2026-10&role=admin&user_id=1&building_id=1')
            ->assertUnprocessable()->assertJsonValidationErrors(['period', 'role', 'user_id', 'building_id']);
    }

    public function test_empty_is_real_zero_with_a_vietnamese_period_and_private_response(): void
    {
        $this->login();
        $response = $this->spa('GET', '/api/v1/dashboard')->assertOk()->assertExactJson(['data' => [
            'period' => '2026-11', 'rented_rooms_count' => 0, 'received_amount' => '0',
            'outstanding_amount' => '0', 'pending_maintenance_count' => 0,
        ]]);
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_approved_metrics_exclude_deposit_pending_cancelled_and_drafts_without_writes(): void
    {
        $this->login();
        $active = Contract::factory()->active()->create(['start_date' => '2025-01-01', 'end_date' => '2025-12-31',
            'deposit_amount' => 5000, 'deposit_status' => DepositStatus::Held, 'deposit_paid_at' => now()]);
        Contract::factory()->create();
        $terminated = Contract::factory()->terminated()->create(['deposit_amount' => 500,
            'deposit_status' => DepositStatus::Settled, 'deposit_deducted_amount' => 500,
            'deposit_paid_at' => now(), 'deposit_settled_at' => now()]);
        $invoice = $this->invoice($active, 0, ['status' => 'partially_paid', 'paid_amount' => 300]);
        $partial = $this->invoice($active, 1, ['status' => 'partially_paid', 'paid_amount' => 400]);
        $paid = $this->invoice($active, 2, ['status' => 'paid', 'paid_amount' => 1000]);
        $this->payment($partial, 400, 'cash', 'confirmed', '2026-10-01 00:00:00');
        $this->payment($paid, 1000, 'cash', 'confirmed', '2026-10-01 00:00:00');
        $this->invoice($active, 3, ['status' => 'draft', 'issued_at' => null]);
        $this->invoice($active, 4, ['status' => 'cancelled', 'cancel_reason' => 'Test cancelled invoice']);
        $this->invoice($active, 5, ['total_amount' => 0]);
        $oldDebt = $this->invoice($terminated, 6, ['status' => 'partially_paid', 'paid_amount' => 500]);
        $this->payment($invoice, 100, 'cash', 'confirmed', '2026-10-31 17:00:00');
        $this->payment($invoice, 200, 'bank_transfer', 'confirmed', '2026-11-01 00:00:00');
        $this->payment($oldDebt, 500, 'deposit', 'confirmed', '2026-11-01 00:00:00');
        $this->payment($invoice, 300, 'bank_transfer', 'pending', null);
        $this->payment($invoice, 400, 'bank_transfer', 'rejected', '2026-11-01 00:00:00');
        $technician = User::factory()->role(UserRole::Technician)->create();
        foreach (['pending', 'pending', 'in_progress', 'resolved', 'rejected'] as $index => $status) {
            MaintenanceRequest::forceCreate(['contract_id' => $active->id, 'room_id' => $active->room_id,
                'user_id' => $active->user_id, 'title' => 'Dashboard test', 'description' => 'Only test fixture',
                'status' => $status, 'assigned_to' => $index === 1 ? $technician->id : null]);
        }
        $tables = ['contracts', 'rooms', 'invoices', 'invoice_items', 'payments', 'maintenance_requests'];
        $before = array_map(fn ($table) => DB::table($table)->orderBy('id')->get()->toJson(), $tables);
        $this->spa('GET', '/api/v1/dashboard')->assertOk()->assertExactJson(['data' => [
            'period' => '2026-11', 'rented_rooms_count' => 1, 'received_amount' => '300',
            'outstanding_amount' => '1800', 'pending_maintenance_count' => 2,
        ]]);
        $this->assertSame($before, array_map(fn ($table) => DB::table($table)->orderBy('id')->get()->toJson(), $tables));
    }

    public function test_receipt_month_uses_review_time_in_vietnam_with_an_exclusive_upper_boundary(): void
    {
        $this->login();
        $contract = Contract::factory()->active()->create();
        $invoice = $this->invoice($contract, 0);
        $this->payment($invoice, 10, 'cash', 'confirmed', '2026-10-31 16:59:59');
        $this->payment($invoice, 20, 'cash', 'confirmed', '2026-10-31 17:00:00');
        $this->payment($invoice, 30, 'bank_transfer', 'confirmed', '2026-11-30 16:59:59');
        $this->payment($invoice, 40, 'cash', 'confirmed', '2026-11-30 17:00:00');
        $this->payment($invoice, 50, 'cash', 'confirmed', null);
        $this->spa('GET', '/api/v1/dashboard')->assertOk()->assertJsonPath('data.received_amount', '50')
            ->assertJsonPath('data.period', '2026-11');
    }

    public function test_cross_invoice_totals_remain_exact_beyond_javascript_safe_integer(): void
    {
        $this->login();
        $contract = Contract::factory()->active()->create();
        foreach ([0, 1] as $month) {
            $invoice = $this->invoice($contract, $month, ['status' => 'paid', 'total_amount' => Money::MAX_VND, 'paid_amount' => Money::MAX_VND]);
            $this->payment($invoice, Money::MAX_VND, 'cash', 'confirmed', '2026-11-01 00:00:00');
            $this->invoice($contract, $month + 2, ['total_amount' => Money::MAX_VND]);
        }
        $this->spa('GET', '/api/v1/dashboard')->assertOk()->assertJsonPath('data.received_amount', '18014398509481982')
            ->assertJsonPath('data.outstanding_amount', '18014398509481982');
    }

    public function test_missing_maintenance_schema_returns_503_instead_of_partial_or_fake_numbers(): void
    {
        DB::rollBack();
        $this->migration->down();
        DB::beginTransaction();
        $this->login();
        $this->spa('GET', '/api/v1/dashboard')->assertStatus(503);
    }
}
