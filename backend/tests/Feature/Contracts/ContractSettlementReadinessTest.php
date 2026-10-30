<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ContractSettlementReadinessTest extends TestCase
{
    use InteractsWithSpaCookies;

    public function test_missing_approved_pending_schema_returns_503_without_writing_business_data(): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasColumn('utility_prices', 'building_id'));
        DB::beginTransaction();
        try {
            $this->initializeSpaClient();
            $admin = User::factory()->role(UserRole::Admin)->create(['password' => 'Settlement readiness!42']);
            $contract = Contract::factory()->active()->create();
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => $admin->phone, 'password' => 'Settlement readiness!42'])->assertOk();
            $this->spa('GET', '/api/v1/contracts/'.$contract->id.'/settlement-preview')->assertStatus(503);
            $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/terminate', ['confirmed' => true, 'expected_revision' => str_repeat('a', 64)])->assertStatus(503);
            $this->assertSame('active', $contract->fresh()->status->value);
            $this->assertSame(0, DB::table('payments')->count());
        } finally {
            DB::rollBack();
        }
    }
}
