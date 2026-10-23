<?php

namespace Tests\Feature\Catalog;

use App\Enums\RoomStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Amenity;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Services\AmenityAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class AmenityAssignmentTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Assignment Test!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => 'Assignment Test!42'])->assertOk();

        return $user;
    }

    private function target(string $resource): Building|Room
    {
        return $resource === 'buildings' ? Building::factory()->create() : Room::factory()->create();
    }

    private function uri(string $resource, Building|Room $target): string
    {
        return '/api/v1/'.$resource.'/'.$target->id.'/amenities';
    }

    private function pivot(string $resource): string
    {
        return $resource === 'buildings' ? 'building_amenities' : 'room_amenities';
    }

    private function foreignKey(string $resource): string
    {
        return $resource === 'buildings' ? 'building_id' : 'room_id';
    }

    /** @return array<string,array{string}> */
    public static function resources(): array
    {
        return ['building' => ['buildings'], 'room' => ['rooms']];
    }

    /** @return array<string,array{string,string,string}> */
    public static function restrictedEndpoints(): array
    {
        $cases = [];
        foreach (['buildings', 'rooms'] as $resource) {
            foreach (['GET', 'PUT'] as $method) {
                foreach (['anonymous', 'user', 'resident', 'technician', 'guard', 'locked'] as $role) {
                    $cases[$resource.' '.$method.' '.$role] = [$resource, $method, $role];
                }
            }
        }

        return $cases;
    }

    #[DataProvider('restrictedEndpoints')]
    public function test_all_endpoints_verify_session_role_and_current_status(string $resource, string $method, string $role): void
    {
        $target = $this->target($resource);
        if ($role !== 'anonymous') {
            $user = $this->signIn($role === 'locked' ? UserRole::Admin : UserRole::from($role));
            if ($role === 'locked') {
                $user->status = UserStatus::Locked;
                $user->save();
            }
        }
        $this->spa($method, $this->uri($resource, $target), ['amenity_ids' => []])->assertStatus($role === 'anonymous' ? 401 : 403);
    }

    #[DataProvider('resources')]
    public function test_active_direct_assignments_can_be_added_replaced_and_cleared(string $resource): void
    {
        $this->signIn();
        $target = $this->target($resource);
        $first = Amenity::factory()->create(['description' => 'Tiện nghi thực']);
        $second = Amenity::factory()->create();
        $uri = $this->uri($resource, $target);
        $this->spa('GET', $uri)->assertOk()->assertExactJson(['data' => ['direct' => [], 'inherited' => [], 'effective' => []]]);
        $response = $this->spa('PUT', $uri, ['amenity_ids' => [$first->id]])->assertOk();
        $expected = ['id' => $first->id, 'name' => $first->name, 'description' => 'Tiện nghi thực', 'is_archived' => false];
        $response->assertExactJson(['data' => ['direct' => [$expected], 'inherited' => [], 'effective' => [$expected]]]);
        $this->spa('GET', $uri)->assertOk()->assertExactJson($response->json());
        $this->spa('PUT', $uri, ['amenity_ids' => [$second->id]])->assertOk()->assertJsonPath('data.direct.0.id', $second->id);
        $this->assertDatabaseMissing($this->pivot($resource), [$this->foreignKey($resource) => $target->id, 'amenity_id' => $first->id]);
        $this->assertDatabaseHas($this->pivot($resource), [$this->foreignKey($resource) => $target->id, 'amenity_id' => $second->id]);
        $this->spa('PUT', $uri, ['amenity_ids' => []])->assertOk()->assertJsonCount(0, 'data.direct')->assertJsonCount(0, 'data.effective');
        $this->assertSame(0, DB::table($this->pivot($resource))->where($this->foreignKey($resource), $target->id)->count());
    }

    public function test_room_inherits_building_amenities_without_copying_pivot_and_union_has_no_duplicates(): void
    {
        $this->signIn();
        $room = Room::factory()->create();
        $otherRoom = Room::factory()->create(['building_id' => $room->building_id]);
        $buildingAmenity = Amenity::factory()->create();
        $roomAmenity = Amenity::factory()->create();
        $room->building->amenities()->attach($buildingAmenity->id);
        $uri = $this->uri('rooms', $room);
        $this->spa('GET', $uri)->assertOk()->assertJsonCount(0, 'data.direct')->assertJsonPath('data.inherited.0.id', $buildingAmenity->id)->assertJsonPath('data.effective.0.id', $buildingAmenity->id);
        $this->assertDatabaseCount('room_amenities', 0);
        $response = $this->spa('PUT', $uri, ['amenity_ids' => [$buildingAmenity->id, $roomAmenity->id]])->assertOk()
            ->assertJsonCount(2, 'data.direct')->assertJsonCount(1, 'data.inherited')->assertJsonCount(2, 'data.effective');
        $this->assertEqualsCanonicalizing([$buildingAmenity->id, $roomAmenity->id], array_column($response->json('data.effective'), 'id'));
        $this->assertDatabaseCount('building_amenities', 1);
        $this->assertDatabaseCount('room_amenities', 2);
        $this->assertSame(0, DB::table('room_amenities')->where('room_id', $otherRoom->id)->count());
        $this->spa('PUT', $uri, ['amenity_ids' => []])->assertOk()->assertJsonCount(0, 'data.direct')->assertJsonPath('data.effective.0.id', $buildingAmenity->id);
        $this->assertDatabaseCount('room_amenities', 0);
        $this->assertDatabaseCount('building_amenities', 1);
    }

    public function test_changing_building_assignment_does_not_rewrite_any_room_direct_selection(): void
    {
        $this->signIn();
        $room = Room::factory()->create();
        $otherRoom = Room::factory()->create(['building_id' => $room->building_id]);
        $own = Amenity::factory()->create();
        $shared = Amenity::factory()->create();
        $room->amenities()->attach($own->id);
        $otherRoom->amenities()->attach($own->id);
        $before = DB::table('room_amenities')->orderBy('room_id')->get()->toJson();
        $this->spa('PUT', $this->uri('buildings', $room->building), ['amenity_ids' => [$shared->id]])->assertOk();
        $this->assertSame($before, DB::table('room_amenities')->orderBy('room_id')->get()->toJson());
        $this->spa('GET', $this->uri('rooms', $room))->assertOk()->assertJsonPath('data.direct.0.id', $own->id)->assertJsonPath('data.inherited.0.id', $shared->id);
    }

    #[DataProvider('resources')]
    public function test_archived_links_are_preserved_and_flagged_when_active_selections_are_edited(string $resource): void
    {
        $this->signIn();
        $target = $this->target($resource);
        $archived = Amenity::factory()->create(['description' => 'Thông tin lịch sử']);
        $old = Amenity::factory()->create();
        $replacement = Amenity::factory()->create();
        $target->amenities()->attach([$archived->id, $old->id]);
        $archived->delete();
        $uri = $this->uri($resource, $target);
        $response = $this->spa('PUT', $uri, ['amenity_ids' => [$replacement->id]])->assertOk()->assertJsonCount(2, 'data.direct');
        $rows = collect($response->json('data.direct'))->keyBy('id');
        $this->assertSame(true, $rows[$archived->id]['is_archived']);
        $this->assertSame('Thông tin lịch sử', $rows[$archived->id]['description']);
        $this->assertSame(false, $rows[$replacement->id]['is_archived']);
        $this->assertDatabaseMissing($this->pivot($resource), [$this->foreignKey($resource) => $target->id, 'amenity_id' => $old->id]);
        $this->spa('PUT', $uri, ['amenity_ids' => []])->assertOk()->assertJsonCount(1, 'data.direct')->assertJsonPath('data.direct.0.id', $archived->id)->assertJsonPath('data.direct.0.is_archived', true);
        $this->assertDatabaseHas($this->pivot($resource), [$this->foreignKey($resource) => $target->id, 'amenity_id' => $archived->id]);
        $this->spa('PUT', $uri, ['amenity_ids' => [$archived->id]])->assertUnprocessable()->assertJsonValidationErrors('amenity_ids.0');
    }

    public function test_archived_inherited_metadata_is_not_lost_from_admin_effective_view(): void
    {
        $this->signIn();
        $room = Room::factory()->create();
        $amenity = Amenity::factory()->create();
        $room->building->amenities()->attach($amenity->id);
        $amenity->delete();
        $this->spa('GET', $this->uri('rooms', $room))->assertOk()->assertJsonCount(0, 'data.direct')
            ->assertJsonPath('data.inherited.0.id', $amenity->id)->assertJsonPath('data.inherited.0.is_archived', true)
            ->assertJsonPath('data.effective.0.id', $amenity->id)->assertJsonPath('data.effective.0.is_archived', true);
        $this->assertDatabaseCount('room_amenities', 0);
    }

    /** @return array<string,array{string,array,string}> */
    public static function invalidAssignments(): array
    {
        $cases = [];
        foreach (['buildings', 'rooms'] as $resource) {
            foreach ([
                'missing' => [[], 'amenity_ids'], 'null' => [['amenity_ids' => null], 'amenity_ids'],
                'not array' => [['amenity_ids' => '1'], 'amenity_ids'],
                'negative id' => [['amenity_ids' => [-1]], 'amenity_ids.0'], 'zero id' => [['amenity_ids' => [0]], 'amenity_ids.0'],
                'fraction id' => [['amenity_ids' => [1.5]], 'amenity_ids.0'], 'unknown id' => [['amenity_ids' => [9999999]], 'amenity_ids.0'],
                'boolean id' => [['amenity_ids' => [true]], 'amenity_ids.0'],
                'inherited override' => [['amenity_ids' => [], 'inherited' => [1]], 'inherited'],
                'price override' => [['amenity_ids' => [], 'price' => 1], 'price'],
                'role override' => [['amenity_ids' => [], 'role' => 'admin'], 'role'],
            ] as $label => [$input, $field]) {
                $cases[$resource.' '.$label] = [$resource, $input, $field];
            }
        }

        return $cases;
    }

    #[DataProvider('invalidAssignments')]
    public function test_invalid_or_unapproved_assignment_payload_never_rewrites_existing_pivot(string $resource, array $input, string $field): void
    {
        $this->signIn();
        $target = $this->target($resource);
        $existing = Amenity::factory()->create();
        $target->amenities()->attach($existing->id);
        $this->spa('PUT', $this->uri($resource, $target), $input)->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertSame([$existing->id], DB::table($this->pivot($resource))->where($this->foreignKey($resource), $target->id)->pluck('amenity_id')->all());
    }

    #[DataProvider('resources')]
    public function test_duplicate_real_ids_and_associative_arrays_are_rejected(string $resource): void
    {
        $this->signIn();
        $target = $this->target($resource);
        $amenity = Amenity::factory()->create();
        $this->spa('PUT', $this->uri($resource, $target), ['amenity_ids' => [$amenity->id, $amenity->id]])->assertUnprocessable()->assertJsonValidationErrors('amenity_ids.0');
        $this->spa('PUT', $this->uri($resource, $target), ['amenity_ids' => ['selected' => $amenity->id]])->assertUnprocessable()->assertJsonValidationErrors('amenity_ids');
        $this->assertDatabaseCount($this->pivot($resource), 0);
    }

    #[DataProvider('resources')]
    public function test_put_requires_real_csrf_but_read_does_not_require_a_csrf_token(string $resource): void
    {
        $this->signIn();
        $target = $this->target($resource);
        $uri = $this->uri($resource, $target);
        $this->spa('PUT', $uri, ['amenity_ids' => []], sendCsrf: false)->assertStatus(419);
        $this->spa('PUT', $uri, ['amenity_ids' => []], ['HTTP_X_XSRF_TOKEN' => 'invalid-token'])->assertStatus(419);
        $this->spa('GET', $uri, sendCsrf: false)->assertOk();
    }

    /** @return array<string,array{string,string,string}> */
    public static function unavailableSchema(): array
    {
        $cases = [];
        foreach (['buildings' => ['buildings', 'amenities', 'building_amenities'], 'rooms' => ['buildings', 'amenities', 'building_amenities', 'rooms', 'room_amenities']] as $resource => $tables) {
            foreach ($tables as $table) {
                foreach (['GET', 'PUT'] as $method) {
                    $cases[$resource.' '.$method.' '.$table] = [$resource, $method, $table];
                }
            }
        }

        return $cases;
    }

    #[DataProvider('unavailableSchema')]
    public function test_missing_required_schema_is_a_safe_503_before_target_lookup(string $resource, string $method, string $missing): void
    {
        $this->signIn();
        Schema::shouldReceive('hasTable')->andReturnUsing(fn (string $table): bool => $table !== $missing);
        $response = $this->spa($method, '/api/v1/'.$resource.'/9999999/amenities', ['amenity_ids' => []])->assertStatus(503)->assertJsonStructure(['message']);
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertArrayNotHasKey('data', $response->json());
    }

    #[DataProvider('resources')]
    public function test_missing_target_is_404_for_reads_and_writes(string $resource): void
    {
        $this->signIn();
        foreach (['GET', 'PUT'] as $method) {
            $this->spa($method, '/api/v1/'.$resource.'/9999999/amenities', ['amenity_ids' => []])->assertNotFound();
        }
    }

    public function test_assigning_room_amenities_never_changes_money_contract_snapshots_status_or_role(): void
    {
        $admin = $this->signIn();
        $room = Room::factory()->create();
        $room->status = RoomStatus::Occupied;
        $room->save();
        $contract = Contract::factory()->active()->create(['room_id' => $room->id]);
        $service = Service::factory()->create();
        DB::table('contract_services')->insert(['contract_id' => $contract->id, 'service_id' => $service->id, 'quantity' => '1.00', 'unit_price' => 50000, 'start_date' => '2026-10-01', 'created_at' => now(), 'updated_at' => now()]);
        $snapshot = [];
        foreach (['rooms', 'buildings', 'contracts', 'services', 'contract_services'] as $table) {
            $snapshot[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }
        $amenity = Amenity::factory()->create();
        $this->spa('PUT', $this->uri('rooms', $room), ['amenity_ids' => [$amenity->id]])->assertOk();
        foreach ($snapshot as $table => $before) {
            $this->assertSame($before, DB::table($table)->orderBy('id')->get()->toJson(), $table.' không được thay đổi bởi gán tiện nghi');
        }
        $this->assertSame(UserRole::Admin, $admin->fresh()->role);
    }

    #[DataProvider('resources')]
    public function test_archive_between_validation_and_write_is_rechecked_and_old_pivot_stays_intact(string $resource): void
    {
        $this->signIn();
        $target = $this->target($resource);
        $old = Amenity::factory()->create();
        $incoming = Amenity::factory()->create();
        $target->amenities()->attach($old->id);
        // Một request khác lưu trữ sau exists validation, trước transaction gán.
        $this->app->instance(AmenityAssignmentService::class, new class extends AmenityAssignmentService
        {
            public function update(Building|Room $target, array $amenityIds): array
            {
                Amenity::findOrFail($amenityIds[0])->delete();

                return parent::update($target, $amenityIds);
            }
        });
        $this->spa('PUT', $this->uri($resource, $target), ['amenity_ids' => [$incoming->id]])->assertUnprocessable()->assertJsonValidationErrors('amenity_ids');
        $this->assertSame([$old->id], DB::table($this->pivot($resource))->where($this->foreignKey($resource), $target->id)->pluck('amenity_id')->all());
        $this->assertSoftDeleted('amenities', ['id' => $incoming->id]);
    }
}
