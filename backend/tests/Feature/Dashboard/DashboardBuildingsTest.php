<?php

namespace Tests\Feature\Dashboard;

use App\Enums\UserRole;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class DashboardBuildingsTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function login(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Dashboard buildings test only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Dashboard buildings test only!42'])->assertOk();

        return $user;
    }

    public function test_counts_use_active_contracts_and_room_status_without_writing_or_n_plus_one(): void
    {
        $this->login();
        $building = Building::factory()->create();
        $rooms = [];
        foreach (['available', 'occupied', 'maintenance', 'inactive'] as $status) {
            $rooms[$status] = Room::factory()->create(['building_id' => $building->id, 'status' => $status]);
        }
        Contract::factory()->active()->create(['room_id' => $rooms['occupied']->id, 'start_date' => '2019-01-01', 'end_date' => '2020-01-01']);
        Contract::factory()->create(['room_id' => $rooms['available']->id]);
        Contract::factory()->terminated()->create(['room_id' => $rooms['maintenance']->id]);
        Contract::factory()->active()->create(['room_id' => $rooms['inactive']->id])->delete();
        $beforeRooms = DB::table('rooms')->orderBy('id')->get()->toJson();
        $beforeContracts = DB::table('contracts')->orderBy('id')->get()->toJson();
        $empty = Building::factory()->count(20)->create();
        DB::enableQueryLog();
        $response = $this->spa('GET', '/api/v1/dashboard/buildings')->assertOk()
            ->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 21)
            ->assertJsonPath('data.0', ['id' => $building->id, 'name' => $building->name, 'rooms_count' => 4, 'rented_rooms_count' => 1, 'available_rooms_count' => 1]);
        $queries = DB::getQueryLog();
        DB::disableQueryLog();
        $this->assertCount(2, array_filter($queries, fn ($query) => str_contains($query['query'], 'from `buildings`')));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->spa('GET', '/api/v1/dashboard/buildings?page=2')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0', ['id' => $empty->last()->id, 'name' => $empty->last()->name, 'rooms_count' => 0, 'rented_rooms_count' => 0, 'available_rooms_count' => 0]);
        $this->assertSame($beforeRooms, DB::table('rooms')->orderBy('id')->get()->toJson());
        $this->assertSame($beforeContracts, DB::table('contracts')->orderBy('id')->get()->toJson());
    }

    public function test_empty_result_is_real_and_query_fields_are_strictly_validated(): void
    {
        $this->login();
        $this->spa('GET', '/api/v1/dashboard/buildings')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        foreach (['page=0', 'page=-1', 'page=1.5', 'page=true', 'page=2147483648', 'building_id=1', 'role.admin=1'] as $query) {
            $this->spa('GET', '/api/v1/dashboard/buildings?'.$query)->assertUnprocessable();
        }
    }

    public function test_only_active_admin_can_read_building_counts(): void
    {
        $this->spa('GET', '/api/v1/dashboard/buildings')->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('GET', '/api/v1/dashboard/buildings')->assertForbidden();
        }
        $admin = $this->login();
        $admin->status = 'locked';
        $admin->save();
        $this->spa('GET', '/api/v1/dashboard/buildings')->assertForbidden();
    }
}
