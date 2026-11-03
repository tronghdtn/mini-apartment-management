<?php

namespace Tests\Feature\Invoices;

use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class PaymentInstructionsTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    private const PASSWORD = 'Payment instruction tests only!42';

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function login(User $user): void
    {
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => self::PASSWORD])->assertOk();
    }

    private function user(UserRole $role): User
    {
        return User::factory()->role($role)->create(['password' => self::PASSWORD]);
    }

    private function invoice(Contract $contract, array $attributes = []): Invoice
    {
        return Invoice::factory()->create(array_merge(['contract_id' => $contract->id, 'period' => '2026-10-01',
            'invoice_number' => 'INV-202610-'.str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT),
            'status' => InvoiceStatus::PartiallyPaid, 'issued_at' => now(), 'due_date' => '2026-11-10',
            'total_amount' => 3778475, 'paid_amount' => 1000000], $attributes));
    }

    private function configureBank(): void
    {
        foreach (['bank.name' => 'Ngân hàng Test', 'bank.account_number' => '0071000123456', 'bank.account_holder' => 'BAN QUAN LY TEST'] as $key => $value) {
            Setting::create(['key' => $key, 'value' => $value, 'type' => 'string', 'group' => 'bank']);
        }
    }

    public function test_owner_and_admin_read_instructions_with_remaining_amount_ignoring_pending(): void
    {
        $this->configureBank();
        $owner = $this->user(UserRole::Resident);
        $invoice = $this->invoice(Contract::factory()->active()->create(['user_id' => $owner->id]));
        Payment::forceCreate(['invoice_id' => $invoice->id, 'amount' => 500000, 'method' => 'bank_transfer', 'status' => 'pending', 'created_at' => now()]);
        $expected = ['payable' => true, 'configured' => true, 'bank_name' => 'Ngân hàng Test', 'account_number' => '0071000123456',
            'account_holder' => 'BAN QUAN LY TEST', 'amount' => 2778475, 'transfer_content' => $invoice->invoice_number];
        $before = DB::table('payments')->orderBy('id')->get()->toJson();

        $this->login($owner);
        $response = $this->spa('GET', "/api/v1/invoices/{$invoice->id}/payment-instructions")->assertOk()->assertExactJson(['data' => $expected]);
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->spa('GET', "/api/v1/invoices/{$invoice->id}/payment-instructions?amount=1")->assertUnprocessable()->assertJsonValidationErrors('amount');
        $this->login($this->user(UserRole::Admin));
        $this->spa('GET', "/api/v1/invoices/{$invoice->id}/payment-instructions")->assertOk()->assertExactJson(['data' => $expected]);
        $this->assertSame($before, DB::table('payments')->orderBy('id')->get()->toJson());
    }

    public function test_paid_cancelled_or_unconfigured_invoices_hide_bank_details(): void
    {
        $owner = $this->user(UserRole::Resident);
        $contract = Contract::factory()->active()->create(['user_id' => $owner->id]);
        $open = $this->invoice($contract);
        $paid = $this->invoice($contract, ['period' => '2026-09-01', 'status' => 'paid', 'paid_amount' => 3778475]);
        $cancelled = $this->invoice($contract, ['period' => '2026-08-01', 'status' => 'cancelled', 'cancel_reason' => 'Test', 'paid_amount' => 0]);
        Setting::create(['key' => 'bank.name', 'value' => 'Ngân hàng Test', 'type' => 'string', 'group' => 'bank']);
        Setting::create(['key' => 'bank.account_number', 'value' => '   ', 'type' => 'string', 'group' => 'bank']);

        $this->login($owner);
        $this->spa('GET', "/api/v1/invoices/{$open->id}/payment-instructions")->assertOk()->assertExactJson(['data' => [
            'payable' => true, 'configured' => false, 'bank_name' => null, 'account_number' => null, 'account_holder' => null,
            'amount' => 2778475, 'transfer_content' => $open->invoice_number]]);
        $this->configureBankHolder();
        foreach ([$paid, $cancelled] as $closed) {
            $this->spa('GET', "/api/v1/invoices/{$closed->id}/payment-instructions")->assertOk()->assertJsonPath('data.payable', false)
                ->assertJsonPath('data.bank_name', null)->assertJsonPath('data.amount', null)->assertJsonPath('data.transfer_content', null);
        }
    }

    public function test_guest_other_roles_foreign_owner_and_drafts_are_rejected(): void
    {
        $this->configureBank();
        $owner = $this->user(UserRole::Resident);
        $contract = Contract::factory()->active()->create(['user_id' => $owner->id]);
        $invoice = $this->invoice($contract);
        $draft = $this->invoice($contract, ['period' => '2026-11-01', 'status' => 'draft', 'invoice_number' => null, 'issued_at' => null, 'due_date' => null, 'paid_amount' => 0]);
        $url = "/api/v1/invoices/{$invoice->id}/payment-instructions";

        $this->spa('GET', $url)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($this->user($role));
            $this->spa('GET', $url)->assertForbidden();
        }
        $this->login($this->user(UserRole::Resident));
        $this->spa('GET', $url)->assertForbidden();
        $this->login($owner);
        $this->spa('GET', "/api/v1/invoices/{$draft->id}/payment-instructions")->assertForbidden();
        $this->spa('GET', '/api/v1/invoices/'.($draft->id + 1000).'/payment-instructions')->assertNotFound();
    }

    private function configureBankHolder(): void
    {
        Setting::where('key', 'bank.account_number')->update(['value' => '0071000123456']);
        Setting::create(['key' => 'bank.account_holder', 'value' => 'BAN QUAN LY TEST', 'type' => 'string', 'group' => 'bank']);
    }
}
