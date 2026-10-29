<?php

namespace Tests\Feature\Notifications;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\NotificationService;
use App\Services\PaymentService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

/** Committed data/afterCommit: deliberately no RefreshDatabase; remove only owned test IDs. */
class NotificationApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private array $users = [];

    private array $contracts = [];

    private bool $ownsSchema = false;

    private $migration;

    private $attachments;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasTable('notifications'), 'Existing notification schema belongs to another run.');
        $this->assertFalse(Schema::hasTable('attachments'), 'Existing attachment schema belongs to another run.');
        $this->assertSame(0, DB::table('users')->count(), 'Do not dispatch to users from other fixtures.');
        $this->migration = require database_path('migrations/pending/2026_10_14_400020_create_notifications_table.php');
        $this->attachments = require database_path('migrations/pending/2026_10_14_400019_create_attachments_table.php');
        $this->attachments->up();
        $this->migration->up();
        $this->ownsSchema = true;
        $this->initializeSpaClient();
    }

    protected function tearDown(): void
    {
        try {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Carbon::setTestNow();
            if ($this->ownsSchema) {
                if (Schema::hasTable('notifications')) {
                    DB::table('notifications')->where('notifiable_type', 'user')->whereIn('notifiable_id', $this->users)->delete();
                    $this->migration->down();
                }
                $contractIds = array_map(fn ($contract) => $contract->id, $this->contracts);
                $invoiceIds = DB::table('invoices')->whereIn('contract_id', $contractIds)->pluck('id');
                DB::table('payments')->whereIn('invoice_id', $invoiceIds)->delete();
                DB::table('invoice_items')->whereIn('invoice_id', $invoiceIds)->delete();
                DB::table('invoices')->whereIn('id', $invoiceIds)->delete();
                DB::table('contract_services')->whereIn('contract_id', $contractIds)->delete();
                DB::table('contracts')->whereIn('id', $contractIds)->delete();
                foreach ($this->contracts as $contract) {
                    $room = $contract->room;
                    DB::table('rooms')->where('id', $room->id)->delete();
                    DB::table('buildings')->where('id', $room->building_id)->delete();
                }
                DB::table('sessions')->whereIn('user_id', $this->users)->delete();
                DB::table('users')->whereIn('id', $this->users)->delete();
                $this->attachments->down();
            }
        } finally {
            parent::tearDown();
        }
    }

    private function user(UserRole $role): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Notification test only!42']);
        $this->users[] = $user->id;

        return $user;
    }

    private function login(User $user): void
    {
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Notification test only!42'])->assertOk();
    }

    public function test_all_roles_only_read_their_notifications_and_read_replay_preserves_time(): void
    {
        $this->spa('GET', '/api/v1/notifications')->assertUnauthorized();
        foreach (UserRole::cases() as $role) {
            $user = $this->user($role);
            $id = (string) Str::uuid();
            DB::table('notifications')->insert(['id' => $id, 'type' => 'test.owned', 'notifiable_type' => 'user', 'notifiable_id' => $user->id,
                'data' => json_encode(['title' => 'Thông báo test', 'body' => 'Nội dung test', 'link' => 'https://example.test/untrusted']), 'created_at' => now(), 'updated_at' => now()]);
            $this->login($user);
            $this->spa('GET', '/api/v1/notifications')->assertOk()->assertJsonCount(1, 'data')
                ->assertJsonPath('unread_count', 1)->assertJsonPath('data.0.id', $id)->assertJsonPath('data.0.link', null);
            $this->spa('POST', '/api/v1/notifications/'.$id.'/read', [], sendCsrf: false)->assertStatus(419);
            $first = $this->spa('POST', '/api/v1/notifications/'.$id.'/read')->assertOk()->json('data.read_at');
            Carbon::setTestNow(now()->addSeconds(30));
            $this->spa('POST', '/api/v1/notifications/'.$id.'/read')->assertOk()->assertJsonPath('data.read_at', $first);
            $this->spa('GET', '/api/v1/notifications?status=unread')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('unread_count', 0);
        }
        $foreign = DB::table('notifications')->where('notifiable_id', '!=', end($this->users))->first();
        $this->spa('POST', '/api/v1/notifications/'.$foreign->id.'/read')->assertNotFound();
        $this->spa('GET', '/api/v1/notifications?status=made_up')->assertUnprocessable();
        $this->spa('GET', '/api/v1/notifications?page=0')->assertUnprocessable();
        $this->spa('POST', '/api/v1/notifications/'.Str::uuid().'/read', ['read_at' => '2020-01-01'])->assertUnprocessable();
        User::whereKey(end($this->users))->update(['status' => 'locked']);
        $this->spa('GET', '/api/v1/notifications')->assertForbidden();
    }

    public function test_pagination_and_unread_count_are_scoped_to_current_user_even_for_admin(): void
    {
        $admin = $this->user(UserRole::Admin);
        $resident = $this->user(UserRole::Resident);
        foreach (range(1, 21) as $index) {
            DB::table('notifications')->insert(['id' => (string) Str::uuid(), 'type' => 'test.page', 'notifiable_type' => 'user', 'notifiable_id' => $admin->id, 'data' => '{}', 'created_at' => now()]);
        }
        $foreign = (string) Str::uuid();
        DB::table('notifications')->insert(['id' => $foreign, 'type' => 'test.foreign', 'notifiable_type' => 'user', 'notifiable_id' => $resident->id, 'data' => '{}', 'created_at' => now()]);
        $this->login($admin);
        $this->spa('GET', '/api/v1/notifications?page=2')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 21)->assertJsonPath('unread_count', 21);
        $this->spa('GET', '/api/v1/notifications?page=3')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('unread_count', 21);
        $this->spa('POST', '/api/v1/notifications/'.$foreign.'/read')->assertNotFound();
    }

    public function test_real_invoice_and_payment_dispatch_after_commit_only_and_deduplicate(): void
    {
        $admin = $this->user(UserRole::Admin);
        $resident = $this->user(UserRole::Resident);
        $contract = Contract::factory()->active()->create(['user_id' => $resident->id, 'start_date' => now()->startOfMonth()->format('Y-m-d')]);
        $this->contracts[] = $contract;
        $invoices = app(InvoiceService::class);
        $invoice = $invoices->createMonthly(['contract_id' => $contract->id, 'period' => $contract->start_date->format('Y-m-d')]);
        DB::beginTransaction();
        $invoices->issue($invoice, $invoice->revision());
        $this->assertDatabaseCount('notifications', 0);
        DB::rollBack();
        $this->assertDatabaseCount('notifications', 0);
        $invoice = $invoices->find($invoice->id);
        $issued = $invoices->issue($invoice, $invoice->revision());
        $this->assertDatabaseCount('notifications', 1);
        $payment = app(PaymentService::class)->store($issued, $admin, ['amount' => 100, 'method' => 'cash', 'confirmed_received' => true, 'expected_revision' => $issued->revision()]);
        $this->assertDatabaseCount('notifications', 2);
        app(PaymentService::class)->confirm($payment, $admin, ['expected_amount' => 100, 'confirmed_received' => true]);
        $this->assertDatabaseCount('notifications', 2);
        $this->assertSame(2, DB::table('notifications')->where('notifiable_id', $resident->id)->count());
        $this->assertSame(0, DB::table('notifications')->where('notifiable_id', $admin->id)->count());
        $this->login($resident);
        $this->spa('GET', '/api/v1/notifications')->assertOk()->assertJsonPath('unread_count', 2);
        $id = DB::table('notifications')->where('type', 'invoice.issued')->value('id');
        $readAt = $this->spa('POST', '/api/v1/notifications/'.$id.'/read')->assertOk()->json('data.read_at');
        $issued->forceFill(['issued_at' => now()->addMinute()])->syncChanges(); // Simulated delivery replay, not a financial write.
        app(NotificationService::class)->saved($issued);
        $this->assertDatabaseCount('notifications', 2);
        $this->spa('GET', '/api/v1/notifications?status=unread')->assertOk()->assertJsonCount(1, 'data');
        $this->assertNotNull($readAt);
        $this->assertSame('JSON', strtoupper(DB::selectOne("SELECT DATA_TYPE AS data_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'data'")->data_type));
    }

    public function test_missing_schema_returns_503_and_rollback_refuses_history(): void
    {
        $user = $this->user(UserRole::Admin);
        $this->login($user);
        $id = (string) Str::uuid();
        DB::table('notifications')->insert(['id' => $id, 'type' => 'test.history', 'notifiable_type' => 'user', 'notifiable_id' => $user->id, 'data' => '{}']);
        try {
            $this->migration->down();
            $this->fail('Rollback must refuse notification history.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('lịch sử', $exception->getMessage());
        }
        $this->assertDatabaseHas('notifications', ['id' => $id]);
        DB::table('notifications')->where('id', $id)->delete();
        $this->migration->down();
        $this->spa('GET', '/api/v1/notifications')->assertStatus(503);
        $this->spa('POST', '/api/v1/notifications/'.Str::uuid().'/read')->assertStatus(503);
    }
}
