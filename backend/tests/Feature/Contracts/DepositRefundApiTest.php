<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\User;
use App\Services\ContractSettlementService;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Tests\Support\InteractsWithContractSettlement;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class DepositRefundApiTest extends TestCase
{
    use InteractsWithContractSettlement, InteractsWithSpaCookies;

    private $refundSchema;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-10-30 08:00:00 UTC');
        $this->prepareSettlementSchema();
        $this->refundSchema = require database_path('migrations/pending/2026_11_02_100001_add_deposit_refund_confirmation_to_contracts_table.php');
        $this->refundSchema->up();
        DB::beginTransaction();
        Storage::fake('private');
        $this->initializeSpaClient();
        $this->admin = User::factory()->role(UserRole::Admin)->create(['password' => 'Refund test only!42']);
        $this->login($this->admin);
    }

    protected function tearDown(): void
    {
        try {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            $this->refundSchema?->down();
            $this->restoreSettlementSchema();
        } finally {
            CarbonImmutable::setTestNow();
            parent::tearDown();
        }
    }

    private function login(User $user): void
    {
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Refund test only!42'])->assertOk();
    }

    private function closed(int $held = 5000000): Contract
    {
        [$contract] = $this->settlementFixture($this->admin, $held);
        $s = app(ContractSettlementService::class);
        $s->terminate($contract, $this->admin, ['expected_revision' => $s->preview($contract, $this->admin)['revision'], 'confirmed' => true]);

        return $contract->fresh();
    }

    public function test_termination_response_revision_matches_a_fresh_snapshot_for_follow_up_refund(): void
    {
        [$c] = $this->settlementFixture($this->admin, 5000000);
        $s = app(ContractSettlementService::class);
        $result = $s->terminate($c, $this->admin, ['expected_revision' => $s->preview($c, $this->admin)['revision'], 'confirmed' => true]);
        $this->assertSame($result['revision'], $s->preview($c->fresh(), $this->admin)['revision']);
    }

    private function body(Contract $contract): array
    {
        $p = app(ContractSettlementService::class)->preview($contract, $this->admin);

        return ['expected_revision' => $p['revision'], 'expected_refund_amount' => $p['deposit_refund_amount'], 'confirmed_paid' => true];
    }

    private function url(Contract $c): string
    {
        return '/api/v1/contracts/'.$c->id.'/deposit-refund-confirmation';
    }

    private function unchangedTables(): array
    {
        $out = [];
        foreach (['rooms', 'users', 'contract_services', 'meter_readings', 'invoices', 'invoice_items', 'payments', 'notifications'] as $table) {
            $out[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }

        return $out;
    }

    public function test_full_refund_records_only_audit_and_replay_preserves_first_admin_and_time(): void
    {
        $contract = $this->closed();
        $other = User::factory()->role(UserRole::Admin)->create(['password' => 'Refund test only!42']);
        $body = $this->body($contract);
        $before = $this->unchangedTables();
        $raw = $contract->getRawOriginal();
        $data = $this->spa('POST', $this->url($contract), $body)->assertOk()
            ->assertJsonPath('data.deposit_refund_amount', 2100000)->assertJsonPath('data.refund_outstanding_amount', 0)
            ->assertJsonPath('data.deposit_refunded_by', $this->admin->id)->json('data');
        $this->assertNotNull($data['deposit_refunded_at']);
        $this->assertNotSame($body['expected_revision'], $data['revision']);
        $after = $contract->fresh()->getRawOriginal();
        foreach (['deposit_refunded_at', 'deposit_refunded_by', 'updated_at'] as $field) {
            unset($raw[$field],$after[$field]);
        }
        $this->assertSame($raw, $after);
        $this->assertSame($before, $this->unchangedTables());
        $this->login($other);
        $this->spa('POST', $this->url($contract), $body)->assertOk()->assertJsonPath('data.deposit_refunded_by', $this->admin->id)
            ->assertJsonPath('data.deposit_refunded_at', $data['deposit_refunded_at'])->assertJsonPath('data.revision', $data['revision']);
        $this->spa('GET', '/api/v1/contracts/'.$contract->id.'/settlement-preview')->assertOk()->assertJsonPath('data.refund_outstanding_amount', 0);
        $this->assertSame($before, $this->unchangedTables());
        $this->spa('POST', $this->url($contract), [...$body, 'expected_refund_amount' => 1])->assertStatus(409);
    }

    public function test_wrong_amount_and_stale_financial_revision_do_not_record_a_refund(): void
    {
        $c = $this->closed();
        $body = $this->body($c);
        $this->spa('POST', $this->url($c), [...$body, 'expected_refund_amount' => 1])->assertStatus(409);
        DB::table('contracts')->where('id', $c->id)->update(['note' => 'Changed by a competing session']);
        $this->spa('POST', $this->url($c), $body)->assertStatus(409);
        $this->assertNull($c->fresh()->deposit_refunded_at);
        $this->assertNull($c->fresh()->deposit_refunded_by);
    }

    public function test_invalid_or_forged_fields_are_rejected_without_partial_audit(): void
    {
        $c = $this->closed();
        $body = $this->body($c);
        foreach ([['confirmed_paid' => false], ['confirmed_paid' => null], ['expected_revision' => 'old'], ['expected_refund_amount' => true],
            ['expected_refund_amount' => 0], ['expected_refund_amount' => 1.5], ['expected_refund_amount' => '9007199254740992'],
            ['deposit_refunded_by' => $this->admin->id], ['deposit_refunded_at' => '2026-01-01'], ['role' => 'admin']] as $bad) {
            $this->spa('POST', $this->url($c), [...$body, ...$bad])->assertUnprocessable();
        }
        $this->spa('POST', $this->url($c), [])->assertUnprocessable();
        $this->assertNull($c->fresh()->deposit_refunded_at);
    }

    public function test_all_other_roles_locked_accounts_guests_and_missing_csrf_are_rejected(): void
    {
        $c = $this->closed();
        $body = $this->body($c);
        $this->spa('POST', $this->url($c), $body, sendCsrf: false)->assertStatus(419);
        $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
        $this->spa('POST', $this->url($c), $body)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $u = User::factory()->role($role)->create(['password' => 'Refund test only!42']);
            $this->login($u);
            $this->spa('POST', $this->url($c), $body)->assertForbidden();
        }
        $this->login($this->admin);
        $this->admin->forceFill(['status' => 'locked'])->save();
        $this->spa('POST', $this->url($c), $body)->assertForbidden();
        $this->assertNull($c->fresh()->deposit_refunded_at);
    }

    public function test_live_actor_role_is_rechecked_inside_the_service(): void
    {
        $c = $this->closed();
        $body = $this->body($c);
        $stale = $this->admin;
        DB::table('users')->where('id', $stale->id)->update(['role' => 'user']);
        try {
            app(ContractSettlementService::class)->confirmRefund($c, $stale, $body);
            $this->fail('Stale role must not pass');
        } catch (HttpExceptionInterface $e) {
            $this->assertSame(403, $e->getStatusCode());
        }
        $this->assertNull($c->fresh()->deposit_refunded_at);
    }

    public function test_active_draft_zero_and_fully_deducted_deposits_cannot_be_confirmed(): void
    {
        foreach ([0, 2900000] as $held) {
            $c = $this->closed($held);
            $this->spa('POST', $this->url($c), [...$this->body($c), 'expected_refund_amount' => 1])->assertStatus(409);
        }
        foreach (['draft', 'active', 'expired'] as $status) {
            $c = Contract::factory()->create(['status' => $status]);
            $this->spa('POST', $this->url($c), ['expected_revision' => str_repeat('a', 64), 'expected_refund_amount' => 1, 'confirmed_paid' => true])->assertStatus(409);
        }
    }

    public function test_missing_and_soft_deleted_contracts_do_not_expose_confirmation(): void
    {
        $c = $this->closed();
        $body = $this->body($c);
        $c->delete();
        $this->spa('POST', $this->url($c), $body)->assertNotFound();
        $this->spa('POST', '/api/v1/contracts/99999999/deposit-refund-confirmation', $body)->assertNotFound();
    }

    public function test_incomplete_or_inconsistent_audit_is_not_silently_treated_as_unpaid_or_paid(): void
    {
        $c = $this->closed();
        $body = $this->body($c);
        DB::table('contracts')->where('id', $c->id)->update(['deposit_refunded_by' => $this->admin->id]);
        $this->spa('GET', '/api/v1/contracts/'.$c->id.'/settlement-preview')->assertStatus(409);
        $this->spa('POST', $this->url($c), $body)->assertStatus(409);
    }

    public function test_sql_failure_rolls_back_and_does_not_leak_sql_or_account_fields(): void
    {
        $c = $this->closed();
        $body = $this->body($c);
        $before = $this->unchangedTables();
        Event::listen('eloquent.updated: '.Contract::class, function (Contract $model): void {
            if ($model->deposit_refunded_at !== null) {
                throw new QueryException('mysql_test', 'sensitive SQL', [], new \Exception('private details'));
            }
        });
        $response = $this->spa('POST', $this->url($c), $body)->assertStatus(500);
        $this->assertStringNotContainsString('sensitive SQL', $response->getContent());
        $this->assertNull($c->fresh()->deposit_refunded_at);
        $this->assertNull($c->fresh()->deposit_refunded_by);
        $this->assertSame($before, $this->unchangedTables());
    }
}
