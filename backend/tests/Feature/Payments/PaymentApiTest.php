<?php

namespace Tests\Feature\Payments;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\Services\InvoiceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private $schema = null;

    private bool $transaction = false;

    private User $owner;

    private User $admin;

    private Invoice $invoice;

    private array $uploads = [];

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-10-28 08:00:00 UTC');
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->schema = require database_path('migrations/pending/2026_10_14_400019_create_attachments_table.php');
        $this->schema->up();
        DB::beginTransaction();
        $this->transaction = true;
        Storage::fake('private');
        $this->initializeSpaClient();
        $this->owner = User::factory()->role(UserRole::Resident)->create(['password' => 'PAY test only!42']);
        $this->admin = User::factory()->role(UserRole::Admin)->create(['password' => 'PAY test only!42']);
        $contract = Contract::factory()->active()->create(['user_id' => $this->owner->id, 'monthly_rent' => 1000000, 'start_date' => '2026-10-01']);
        $service = app(InvoiceService::class);
        $draft = $service->createMonthly(['contract_id' => $contract->id, 'period' => '2026-10-01']);
        $this->invoice = $service->issue($draft, $draft->revision());
    }

    protected function tearDown(): void
    {
        try {
            if ($this->transaction) {
                $this->assertSame(1, DB::transactionLevel());
                DB::rollBack();
            }
            $this->schema?->down();
        } finally {
            CarbonImmutable::setTestNow();
            parent::tearDown();
        }
    }

    private function login(?User $user = null): void
    {
        $user ??= $this->owner;
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'PAY test only!42'])->assertOk();
    }

    private function photo(): UploadedFile
    {
        $file = UploadedFile::fake()->createWithContent('proof.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $this->uploads[] = $file; // Keep the fake's temporary stream alive through the HTTP request.

        return new UploadedFile($file->getPathname(), 'proof.png', null, null, true);
    }

    private function submit(int $amount = 400000): array
    {
        return $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', ['amount' => $amount], files: ['proof' => $this->photo()])
            ->assertCreated()->json('data');
    }

    private function detail(int $id): array
    {
        return $this->spa('GET', '/api/v1/payments/'.$id)->assertOk()->json('data');
    }

    private function confirm(array $payment, array $override = [])
    {
        return $this->spa('POST', '/api/v1/payments/'.$payment['id'].'/confirm', ['expected_revision' => $payment['revision'],
            'expected_amount' => $payment['amount'], 'confirmed_received' => true, ...$override]);
    }

    public function test_pending_proof_is_private_does_not_reduce_debt_and_terminated_owner_keeps_access(): void
    {
        $this->login();
        $payment = $this->submit();
        $this->assertSame('pending', $payment['status']);
        $this->assertNull($payment['receipt_number']);
        $this->assertNull($payment['revision']);
        $this->assertTrue($payment['has_proof']);
        $this->assertSame(1000000, $payment['invoice']['outstanding_amount']);
        $this->assertSame(0, $this->invoice->fresh()->paid_amount);
        $this->assertCount(1, Storage::disk('private')->allFiles());
        $this->spa('GET', '/api/v1/payments/'.$payment['id'].'/proof')->assertOk()->assertHeader('Content-Type', 'image/png')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        DB::table('contracts')->where('id', $this->invoice->contract_id)->update(['status' => 'terminated', 'actual_end_date' => '2026-10-29']);
        $this->spa('GET', '/api/v1/payments')->assertOk()->assertJsonCount(1, 'data');
        $this->spa('GET', '/api/v1/payments/'.$payment['id'])->assertOk();
        $this->submit(100000); // Q8: no active contract required for an old invoice.
        $this->login(User::factory()->role(UserRole::Resident)->create(['password' => 'PAY test only!42']));
        $this->spa('GET', '/api/v1/payments')->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/payments/'.$payment['id'])->assertForbidden();
        $this->spa('GET', '/api/v1/payments/'.$payment['id'].'/proof')->assertForbidden();
        $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', ['amount' => 1], files: ['proof' => $this->photo()])->assertForbidden();
    }

    public function test_admin_confirms_partial_replay_keeps_receipt_and_direct_cash_finishes_without_changing_invoice_lines(): void
    {
        $this->login();
        $pending = $this->submit();
        $snapshot = $this->invoice->fresh()->only(['total_amount', 'due_date', 'invoice_number']);
        $items = $this->invoice->items->toArray();
        $this->login($this->admin);
        $review = $this->detail($pending['id']);
        $confirmed = $this->confirm($review)->assertOk()->json('data');
        $this->assertSame('confirmed', $confirmed['status']);
        $this->assertSame('partially_paid', $confirmed['invoice']['status']);
        $this->assertSame(400000, $confirmed['invoice']['paid_amount']);
        $this->assertSame(600000, $confirmed['invoice']['outstanding_amount']);
        $this->assertStringStartsWith('RCP-202610-', $confirmed['receipt_number']);
        $replay = $this->confirm($review)->assertOk()->json('data');
        $this->assertSame($confirmed['receipt_number'], $replay['receipt_number']);
        $this->assertSame($confirmed['reviewed_at'], $replay['reviewed_at']);
        $this->assertSame(1, Payment::count());
        $invoice = $this->spa('GET', '/api/v1/invoices/'.$this->invoice->id)->assertOk()->json('data');
        $body = ['amount' => 600000, 'method' => 'cash', 'confirmed_received' => true, 'expected_revision' => $invoice['revision']];
        $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', $body)->assertCreated()
            ->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.invoice.status', 'paid')->assertJsonPath('data.invoice.outstanding_amount', 0);
        $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', $body)->assertConflict();
        $this->assertSame(2, Payment::count());
        $this->assertEquals($snapshot, $this->invoice->fresh()->only(['total_amount', 'due_date', 'invoice_number']));
        $this->assertSame($items, $this->invoice->fresh()->items->toArray());
        $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/cancel', ['expected_revision' => $this->invoice->fresh()->revision(), 'reason' => 'Không được bỏ tiền đã thu'])->assertConflict();
    }

    public function test_rejection_requires_reason_keeps_photo_and_does_not_create_receipt_or_reduce_debt(): void
    {
        $this->login();
        $pending = $this->submit();
        $this->login($this->admin);
        $review = $this->detail($pending['id']);
        $url = '/api/v1/payments/'.$pending['id'].'/reject';
        $this->spa('POST', $url, ['expected_revision' => $review['revision']])->assertUnprocessable()->assertJsonValidationErrors('reject_reason');
        $rejected = $this->spa('POST', $url, ['expected_revision' => $review['revision'], 'reject_reason' => 'Chưa thấy tiền thực nhận'])->assertOk()->json('data');
        $this->assertSame('rejected', $rejected['status']);
        $this->assertNull($rejected['receipt_number']);
        $this->assertSame(0, $this->invoice->fresh()->paid_amount);
        $this->assertCount(1, Storage::disk('private')->allFiles());
        $this->confirm($rejected)->assertConflict();
        $this->spa('POST', $url, ['expected_revision' => $rejected['revision'], 'reject_reason' => 'Không đổi lịch sử'])->assertConflict();
        $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/cancel', ['expected_revision' => $this->invoice->fresh()->revision(), 'reason' => 'Đã xử lý pending, lập lại'])->assertOk();
        $this->login();
        $this->spa('GET', '/api/v1/payments/'.$pending['id'])->assertOk()->assertJsonPath('data.reject_reason', 'Chưa thấy tiền thực nhận');
        $this->spa('GET', '/api/v1/payments/'.$pending['id'].'/proof')->assertOk();
    }

    public function test_guest_staff_owner_review_csrf_and_forged_money_fields_are_rejected(): void
    {
        $this->spa('GET', '/api/v1/payments')->assertUnauthorized();
        $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', [])->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login(User::factory()->role($role)->create(['password' => 'PAY test only!42']));
            $this->spa('GET', '/api/v1/payments')->assertForbidden();
            $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', [])->assertForbidden();
            $this->spa('POST', '/api/v1/payments/999999/confirm', [])->assertForbidden();
        }
        $this->login();
        $pending = $this->submit();
        foreach (['confirm', 'reject'] as $action) {
            $this->spa('POST', '/api/v1/payments/'.$pending['id'].'/'.$action, [])->assertForbidden();
        }
        $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', ['amount' => 1], sendCsrf: false, files: ['proof' => $this->photo()])->assertStatus(419);
        foreach (['status' => 'confirmed', 'method' => 'deposit', 'submitted_by' => $this->admin->id, 'receipt_number' => 'RCP-FORGED'] as $field => $value) {
            $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', ['amount' => 1, $field => $value], files: ['proof' => $this->photo()])->assertUnprocessable();
        }
        foreach ([0, -1, 1.5, true, 1000001] as $amount) {
            $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', ['amount' => $amount], files: ['proof' => $this->photo()])->assertUnprocessable();
        }
        $this->assertSame(1, Payment::count());
        $this->assertCount(1, Storage::disk('private')->allFiles());
    }

    public function test_overlapping_pending_does_not_reserve_money_and_second_confirmation_cannot_overpay(): void
    {
        $this->login();
        $first = $this->submit(700000);
        $second = $this->submit(700000);
        $this->login($this->admin);
        $a = $this->detail($first['id']);
        $b = $this->detail($second['id']);
        $this->confirm($a, ['confirmed_received' => false])->assertUnprocessable();
        $this->confirm($a, ['expected_amount' => 1])->assertConflict();
        $this->confirm($a)->assertOk();
        $this->confirm($b)->assertConflict(); // Stale invoice revision.
        $fresh = $this->detail($second['id']);
        $this->confirm($fresh)->assertConflict(); // Even after reload, never cut or overpay.
        $this->assertSame(700000, $this->invoice->fresh()->paid_amount);
        $this->assertDatabaseHas('payments', ['id' => $second['id'], 'status' => 'pending', 'receipt_number' => null]);
        $this->assertSame(1, Payment::where('status', 'confirmed')->count());
    }

    public function test_draft_cancelled_zero_paid_and_corrupt_ledger_do_not_accept_money_or_leave_files(): void
    {
        $this->login();
        foreach (['draft', 'cancelled', 'paid'] as $status) {
            DB::table('invoices')->where('id', $this->invoice->id)->update(['status' => $status]);
            $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', ['amount' => 1], files: ['proof' => $this->photo()])
                ->assertStatus($status === 'draft' ? 403 : 409);
        }
        DB::table('invoices')->where('id', $this->invoice->id)->update(['status' => 'issued', 'paid_amount' => 1000]);
        $this->spa('POST', '/api/v1/invoices/'.$this->invoice->id.'/payments', ['amount' => 1], files: ['proof' => $this->photo()])->assertConflict();
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('attachments', 0);
        $this->assertCount(0, Storage::disk('private')->allFiles());
        $this->assertSame(1000, $this->invoice->fresh()->paid_amount); // Do not silently repair unrelated money.
    }

    public function test_missing_fake_or_oversized_image_is_rejected_and_missing_proof_blocks_confirmation(): void
    {
        $this->login();
        $url = '/api/v1/invoices/'.$this->invoice->id.'/payments';
        $this->spa('POST', $url, ['amount' => 1])->assertUnprocessable()->assertJsonValidationErrors('proof');
        $fake = UploadedFile::fake()->createWithContent('wrong.jpg', 'not an image');
        $this->spa('POST', $url, ['amount' => 1], files: ['proof' => new UploadedFile($fake->getPathname(), 'wrong.jpg', null, null, true)])->assertUnprocessable();
        $png = $this->photo();
        file_put_contents($png->getPathname(), str_repeat('x', 5 * 1024 * 1024), FILE_APPEND);
        $this->spa('POST', $url, ['amount' => 1], files: ['proof' => $png])->assertUnprocessable();
        $this->assertDatabaseCount('payments', 0);
        $pending = $this->submit();
        $this->login($this->admin);
        $review = $this->detail($pending['id']);
        $path = Payment::findOrFail($pending['id'])->attachments()->sole()->path;
        Storage::disk('private')->delete($path);
        $this->confirm($review)->assertConflict();
        $this->assertDatabaseHas('payments', ['id' => $pending['id'], 'status' => 'pending', 'receipt_number' => null]);
        $this->assertSame(0, $this->invoice->fresh()->paid_amount);
    }
}
