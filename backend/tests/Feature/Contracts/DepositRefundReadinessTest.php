<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\InteractsWithContractSettlement;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class DepositRefundReadinessTest extends TestCase
{
    use InteractsWithContractSettlement, InteractsWithSpaCookies;

    public function test_existing_closure_works_without_refund_columns_but_new_confirmation_returns_503(): void
    {
        CarbonImmutable::setTestNow('2026-10-30 08:00:00 UTC');
        $this->prepareSettlementSchema();
        DB::beginTransaction();
        try {
            $this->initializeSpaClient();
            $admin = User::factory()->role(UserRole::Admin)->create(['password' => 'Refund readiness only!42']);
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => $admin->phone, 'password' => 'Refund readiness only!42'])->assertOk();
            [$c] = $this->settlementFixture($admin, 5000000);
            $url = '/api/v1/contracts/'.$c->id;
            $p = $this->spa('GET', $url.'/settlement-preview')->assertOk()->assertJsonMissingPath('data.deposit_refunded_at')->json('data');
            $this->spa('POST', $url.'/terminate', ['expected_revision' => $p['revision'], 'confirmed' => true])->assertOk();
            $this->spa('GET', $url.'/settlement-preview')->assertOk()->assertJsonMissingPath('data.refund_outstanding_amount');
            $this->spa('POST', $url.'/deposit-refund-confirmation', ['expected_revision' => $p['revision'], 'expected_refund_amount' => 2100000, 'confirmed_paid' => true])->assertStatus(503);
            $this->assertSame(2100000, $c->fresh()->deposit_refund_amount);
            $this->assertSame('terminated', $c->fresh()->status->value);
        } finally {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }$this->restoreSettlementSchema();
            CarbonImmutable::setTestNow();
        }
    }
}
