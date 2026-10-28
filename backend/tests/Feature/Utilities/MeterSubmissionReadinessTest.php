<?php

namespace Tests\Feature\Utilities;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class MeterSubmissionReadinessTest extends TestCase
{
    use InteractsWithSpaCookies;

    public function test_pending_schema_returns_503_before_querying_route_ids(): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasTable('meter_reading_submissions'));
        DB::beginTransaction();
        try {
            $this->initializeSpaClient();
            $admin = User::factory()->role(UserRole::Admin)->create(['password' => 'U2 readiness!42']);
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => $admin->phone, 'password' => 'U2 readiness!42'])->assertOk();
            foreach (['', '/999999', '/999999/photo'] as $suffix) {
                $this->spa('GET', '/api/v1/meter-reading-submissions'.$suffix)->assertStatus(503);
            }
            foreach (['approve', 'reject'] as $action) {
                $this->spa('POST', '/api/v1/meter-reading-submissions/999999/'.$action)->assertStatus(503);
            }
            $resident = User::factory()->role(UserRole::Resident)->create(['password' => 'U2 readiness!42']);
            Contract::factory()->active()->create(['user_id' => $resident->id]);
            $this->spa('POST', '/api/v1/auth/login', ['identifier' => $resident->phone, 'password' => 'U2 readiness!42'])->assertOk();
            $this->spa('GET', '/api/v1/meter-reading-submissions/context')->assertStatus(503);
            $this->spa('POST', '/api/v1/meter-reading-submissions')->assertStatus(503);
        } finally {
            DB::rollBack();
        }
    }
}
