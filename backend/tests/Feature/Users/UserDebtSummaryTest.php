<?php

namespace Tests\Feature\Users;

use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class UserDebtSummaryTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    private const PASSWORD = 'User debt summary tests only!42';

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
        // 17:30 UTC ngày 01/11 = 00:30 ngày 02/11 giờ Việt Nam: "hôm nay" phải là 02/11.
        Carbon::setTestNow('2026-11-01 17:30:00');
        CarbonImmutable::setTestNow('2026-11-01 17:30:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function login(UserRole $role = UserRole::Admin, bool $locked = false): User
    {
        $user = User::factory()->role($role)->create(['password' => self::PASSWORD]);
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => self::PASSWORD])->assertOk();
        if ($locked) {
            User::whereKey($user->id)->update(['status' => 'locked']);
        }

        return $user;
    }

    private function invoice(Contract $contract, int $month, array $attributes = []): Invoice
    {
        return Invoice::factory()->create(array_merge([
            'contract_id' => $contract->id, 'period' => CarbonImmutable::parse('2026-01-01')->addMonths($month)->format('Y-m-d'),
            'status' => InvoiceStatus::Issued, 'issued_at' => now(), 'due_date' => '2026-11-02',
            'total_amount' => 1000, 'paid_amount' => 0,
        ], $attributes));
    }

    public function test_only_active_admin_can_read_and_query_or_missing_user_is_rejected(): void
    {
        $target = User::factory()->role(UserRole::Resident)->create();
        $url = "/api/v1/users/{$target->id}/debt-summary";
        $this->spa('GET', $url)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('GET', $url)->assertForbidden();
        }
        $this->login(locked: true);
        $this->spa('GET', $url)->assertForbidden();
        $this->login();
        $this->spa('GET', $url.'?user_id=1&period=2026-10')->assertUnprocessable()->assertJsonValidationErrors(['user_id', 'period']);
        $this->spa('GET', '/api/v1/users/'.($target->id + 1000).'/debt-summary')->assertNotFound();
        $response = $this->spa('GET', $url)->assertOk()->assertExactJson(['data' => [
            'outstanding_amount' => '0', 'outstanding_invoice_count' => 0, 'overdue_amount' => '0', 'overdue_invoice_count' => 0,
        ]]);
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_summary_matches_resident_overview_rules_for_the_target_user_only(): void
    {
        $target = User::factory()->role(UserRole::Resident)->create(['password' => self::PASSWORD]);
        $active = Contract::factory()->active()->create(['user_id' => $target->id, 'start_date' => '2026-01-01', 'end_date' => '2027-06-30']);
        $old = Contract::factory()->terminated()->create(['user_id' => $target->id, 'start_date' => '2025-01-01', 'end_date' => '2025-12-31']);
        $deleted = Contract::factory()->terminated()->create(['user_id' => $target->id, 'start_date' => '2024-01-01', 'end_date' => '2024-12-31']);
        $foreign = Contract::factory()->active()->create();

        // Còn 700, hạn đúng hôm nay (giờ VN) nên chưa quá hạn; payment pending không được trừ nợ.
        $partial = $this->invoice($active, 0, ['status' => 'partially_paid', 'paid_amount' => 300]);
        Payment::forceCreate(['invoice_id' => $partial->id, 'amount' => 500, 'method' => 'bank_transfer',
            'status' => 'pending', 'created_at' => '2026-11-01 00:00:00']);
        $this->invoice($active, 1, ['due_date' => '2026-11-01', 'total_amount' => 2500]);
        $this->invoice($old, 2, ['type' => 'final', 'due_date' => '2026-01-10', 'total_amount' => 400]);
        $this->invoice($deleted, 3, ['due_date' => null, 'total_amount' => 50]);
        $deleted->delete();
        $this->invoice($active, 4, ['status' => 'paid', 'paid_amount' => 1000]);
        $this->invoice($active, 5, ['status' => 'draft', 'issued_at' => null, 'due_date' => null]);
        $this->invoice($active, 6, ['status' => 'cancelled', 'cancel_reason' => 'Test cancelled invoice']);
        $this->invoice($foreign, 0, ['due_date' => '2026-01-01', 'total_amount' => 999999]);
        $expected = ['outstanding_amount' => '3650', 'outstanding_invoice_count' => 4, 'overdue_amount' => '2900', 'overdue_invoice_count' => 2];

        $this->login();
        $tables = ['contracts', 'invoices', 'payments'];
        $before = array_map(fn ($table) => DB::table($table)->orderBy('id')->get()->toJson(), $tables);
        $this->spa('GET', "/api/v1/users/{$target->id}/debt-summary")->assertOk()->assertExactJson(['data' => $expected]);
        $this->assertSame($before, array_map(fn ($table) => DB::table($table)->orderBy('id')->get()->toJson(), $tables));

        // Cùng nguồn tính với tổng quan Cư dân: cư dân đó tự xem phải ra đúng số liệu.
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $target->email, 'password' => self::PASSWORD])->assertOk();
        $this->spa('GET', '/api/v1/resident/overview')->assertOk()->assertJsonPath('data.debt', $expected);
    }
}
