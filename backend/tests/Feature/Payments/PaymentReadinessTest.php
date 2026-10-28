<?php

namespace Tests\Feature\Payments;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class PaymentReadinessTest extends TestCase
{
    use InteractsWithSpaCookies;

    public function test_pending_attachment_schema_returns_503_before_route_id_queries(): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasTable('attachments'));
        DB::beginTransaction();
        try {
            $this->initializeSpaClient();
            $admin = User::factory()->role(UserRole::Admin)->create(['password' => 'PAY readiness!42']);
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => $admin->phone, 'password' => 'PAY readiness!42'])->assertOk();
            foreach (['', '/999999', '/999999/proof'] as $suffix) {
                $this->spa('GET', '/api/v1/payments'.$suffix)->assertStatus(503);
            }
            foreach (['confirm', 'reject'] as $action) {
                $this->spa('POST', '/api/v1/payments/999999/'.$action)->assertStatus(503);
            }
            $this->spa('POST', '/api/v1/invoices/999999/payments', [])->assertStatus(503);
        } finally {
            DB::rollBack();
        }
    }
}
