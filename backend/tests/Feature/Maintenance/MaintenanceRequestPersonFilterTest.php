<?php

namespace Tests\Feature\Maintenance;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\MaintenanceRequest;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class MaintenanceRequestPersonFilterTest extends TestCase
{
    use InteractsWithSpaCookies;

    private const PASSWORD = 'Maintenance filter tests only!42';

    private array $migrations = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        foreach (['2026_10_14_400017_create_maintenance_requests_table.php', '2026_10_14_400019_create_attachments_table.php'] as $file) {
            $migration = require database_path('migrations/pending/'.$file);
            $migration->up();
            $this->migrations[] = $migration;
        }
        DB::beginTransaction();
        $this->initializeSpaClient();
    }

    protected function tearDown(): void
    {
        try {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach (array_reverse($this->migrations) as $migration) {
                $migration->down();
            }
        } finally {
            parent::tearDown();
        }
    }

    private function login(UserRole $role): User
    {
        $user = User::factory()->role($role)->create(['password' => self::PASSWORD]);
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => self::PASSWORD])->assertOk();

        return $user;
    }

    private function request(Contract $contract, ?User $assignee, string $status = 'pending'): MaintenanceRequest
    {
        return MaintenanceRequest::forceCreate(['contract_id' => $contract->id, 'room_id' => $contract->room_id,
            'user_id' => $contract->user_id, 'title' => 'Bộ lọc test', 'description' => 'Chỉ dùng trong test',
            'status' => $status, 'assigned_to' => $assignee?->id]);
    }

    public function test_admin_filters_by_reporter_and_assignee_across_pages_combined_with_status(): void
    {
        $technician = User::factory()->role(UserRole::Technician)->create();
        $other = User::factory()->role(UserRole::Technician)->create();
        $mine = Contract::factory()->active()->create();
        $foreign = Contract::factory()->active()->create();
        $ids = [];
        foreach (range(1, 21) as $index) {
            $ids[] = $this->request($mine, $index <= 3 ? $technician : null, $index === 1 ? 'in_progress' : 'pending')->id;
        }
        $this->request($foreign, $technician);
        $this->request($foreign, $other);

        $this->login(UserRole::Admin);
        $first = $this->spa('GET', "/api/v1/maintenance-requests?user_id={$mine->user_id}")->assertOk()
            ->assertJsonPath('meta.total', 21)->assertJsonCount(20, 'data');
        $this->assertSame(array_slice(array_reverse($ids), 0, 20), array_column($first->json('data'), 'id'));
        $this->spa('GET', "/api/v1/maintenance-requests?user_id={$mine->user_id}&page=2")->assertOk()
            ->assertJsonPath('data.0.id', $ids[0])->assertJsonCount(1, 'data');
        $this->spa('GET', "/api/v1/maintenance-requests?assigned_to={$technician->id}")->assertOk()->assertJsonPath('meta.total', 4);
        $this->spa('GET', "/api/v1/maintenance-requests?assigned_to={$technician->id}&user_id={$mine->user_id}&status=in_progress")
            ->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $ids[0]);
        $this->spa('GET', '/api/v1/maintenance-requests?user_id=2147483647')->assertOk()->assertJsonPath('meta.total', 0);
        foreach (['user_id=true', 'user_id=0', 'assigned_to=abc', 'assigned_to=-1', 'user_id=2147483648'] as $query) {
            $this->spa('GET', '/api/v1/maintenance-requests?'.$query)->assertUnprocessable();
        }
    }

    public function test_other_roles_cannot_send_person_filters_and_keep_their_own_scope(): void
    {
        $contract = Contract::factory()->active()->create();
        $this->request($contract, null);
        foreach ([UserRole::Resident, UserRole::Technician] as $role) {
            $actor = $this->login($role);
            $this->spa('GET', '/api/v1/maintenance-requests')->assertOk()->assertJsonPath('meta.total', 0);
            $this->spa('GET', "/api/v1/maintenance-requests?user_id={$contract->user_id}&assigned_to={$actor->id}")
                ->assertUnprocessable()->assertJsonValidationErrors(['user_id', 'assigned_to']);
        }
    }
}
