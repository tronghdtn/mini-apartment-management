<?php

namespace Tests\Feature\Catalog;

use App\Enums\RoomStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Amenity;
use App\Models\Building;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PublicRoomTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/public/rooms';

    private function room(array $data = []): Room
    {
        return Room::factory()->create(['is_public' => true, ...$data]);
    }

    private function index(array $query = [])
    {
        return $this->getJson(self::URL.'?'.http_build_query($query));
    }

    public function test_anonymous_list_and_detail_expose_only_public_fields_with_correct_types(): void
    {
        $room = $this->room(['area' => '25.50', 'base_price' => 0, 'deposit_amount' => 9007199254740991]);
        $room->building->update(['latitude' => '10.1234567', 'longitude' => null]);
        $roomFields = ['id', 'code', 'floor_number', 'area', 'base_price', 'deposit_amount', 'max_occupants', 'description', 'building', 'amenities', 'photos'];
        $response = $this->getJson(self::URL.'/'.$room->id)->assertOk()
            ->assertJsonPath('data.area', '25.50')->assertJsonPath('data.base_price', 0)
            ->assertJsonPath('data.deposit_amount', 9007199254740991)
            ->assertJsonPath('data.building.latitude', '10.1234567')->assertJsonPath('data.building.longitude', null);
        $this->assertEqualsCanonicalizing($roomFields, array_keys($response->json('data')));
        $this->assertEqualsCanonicalizing(['id', 'name', 'address', 'latitude', 'longitude'], array_keys($response->json('data.building')));
        $this->index()->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0', $response->json('data'));
        $this->assertDatabaseCount('rooms', 1);
    }

    public static function excludedRooms(): array
    {
        return [
            'private' => ['available', false], 'occupied' => ['occupied', true],
            'maintenance' => ['maintenance', true], 'inactive' => ['inactive', true],
        ];
    }

    #[DataProvider('excludedRooms')]
    public function test_hidden_room_never_leaks_through_list_detail_or_filters(string $status, bool $public): void
    {
        $room = $this->room(['is_public' => $public, 'status' => RoomStatus::from($status)]);
        $amenity = Amenity::factory()->create();
        $room->amenities()->attach($amenity);
        $this->index()->assertOk()->assertJsonCount(0, 'data');
        $this->getJson(self::URL.'/'.$room->id)->assertNotFound();
        $this->getJson(self::URL.'/filters')->assertOk()->assertExactJson(['data' => ['buildings' => [], 'amenities' => []]]);
    }

    public function test_missing_or_non_numeric_room_does_not_fall_back_to_another_room(): void
    {
        $room = $this->room();
        $this->getJson(self::URL.'/'.($room->id + 1))->assertNotFound();
        $this->getJson(self::URL.'/abc')->assertNotFound();
    }

    public function test_amenities_are_union_deduplicated_and_archived_links_remain_untouched(): void
    {
        $room = $this->room();
        [$buildingOnly, $roomOnly, $shared, $archived] = Amenity::factory()->count(4)->create()->all();
        $room->building->amenities()->attach([$buildingOnly->id, $shared->id, $archived->id]);
        $room->amenities()->attach([$roomOnly->id, $shared->id, $archived->id]);
        $archived->delete();
        $expected = [$buildingOnly->id, $roomOnly->id, $shared->id];
        $this->getJson(self::URL.'/'.$room->id)->assertOk()->assertJsonCount(3, 'data.amenities')
            ->assertJsonPath('data.amenities.0.id', $expected[0]);
        $this->assertSame($expected, $this->index()->json('data.0.amenities.*.id'));
        $this->index(['amenity_ids' => $expected])->assertOk()->assertJsonCount(1, 'data');
        $this->index(['amenity_ids' => [$archived->id]])->assertOk()->assertJsonCount(0, 'data');
        $this->getJson(self::URL.'/filters')->assertOk()->assertJsonCount(3, 'data.amenities');
        $this->assertDatabaseHas('room_amenities', ['room_id' => $room->id, 'amenity_id' => $archived->id]);
        $this->assertDatabaseHas('building_amenities', ['building_id' => $room->building_id, 'amenity_id' => $archived->id]);
    }

    public function test_filter_options_exclude_unlinked_private_only_and_archived_catalogs(): void
    {
        $room = $this->room();
        $private = Room::factory()->create();
        [$public, $privateOnly, $unlinked, $archived] = Amenity::factory()->count(4)->create()->all();
        $room->building->amenities()->attach([$public->id, $archived->id]);
        $private->amenities()->attach($privateOnly);
        $archived->delete();
        Building::factory()->create();
        $this->getJson(self::URL.'/filters')->assertOk()->assertExactJson(['data' => [
            'buildings' => [['id' => $room->building_id, 'name' => $room->building->name]],
            'amenities' => [['id' => $public->id, 'name' => $public->name]],
        ]]);
    }

    public function test_filters_use_and_and_inclusive_numeric_bounds(): void
    {
        $room = $this->room(['code' => 'MATCH', 'base_price' => 3500000, 'area' => '25.50', 'max_occupants' => 3]);
        $this->room(['building_id' => $room->building_id, 'code' => 'OTHER', 'base_price' => 3500001]);
        $this->room(['code' => 'MATCH']);
        $query = ['q' => 'MATCH', 'building_id' => $room->building_id, 'min_price' => 3500000, 'max_price' => 3500000,
            'min_area' => '25.50', 'max_area' => '25.50', 'min_occupants' => 3, 'max_occupants' => 3];
        $this->index($query)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $room->id);
        foreach (['min_price' => 3500001, 'min_area' => '25.51', 'min_occupants' => 4] as $key => $value) {
            $this->index(['building_id' => $room->building_id, 'q' => 'MATCH', $key => $value])
                ->assertOk()->assertJsonCount(0, 'data');
        }
        $this->index(['building_id' => 999999])->assertOk()->assertJsonCount(0, 'data');
        $this->index(['amenity_ids' => [999999]])->assertOk()->assertJsonCount(0, 'data');
    }

    public static function searchTerms(): array
    {
        return ['percent' => ['%'], 'underscore' => ['_'], 'quote' => ["' OR 1=1 --"], 'unicode' => ['Đường Việt']];
    }

    #[DataProvider('searchTerms')]
    public function test_search_treats_special_characters_as_literal_bound_values(string $term): void
    {
        $room = $this->room();
        $room->building->update(['address' => 'Địa chỉ '.$term]);
        $this->room();
        $this->index(['q' => $term])->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $room->id);
    }

    public static function sorts(): array
    {
        return ['price asc' => ['price_asc', 'base_price', false], 'price desc' => ['price_desc', 'base_price', true],
            'area asc' => ['area_asc', 'area', false], 'area desc' => ['area_desc', 'area', true]];
    }

    #[DataProvider('sorts')]
    public function test_sort_is_allowlisted_and_ties_use_id(string $sort, string $field, bool $descending): void
    {
        $first = $this->room([$field => 10]);
        $second = $this->room([$field => 10]);
        $third = $this->room([$field => 20]);
        $expected = $descending ? [$third->id, $first->id, $second->id] : [$first->id, $second->id, $third->id];
        $this->assertSame($expected, $this->index(['sort' => $sort])->assertOk()->json('data.*.id'));
    }

    public function test_pagination_is_stable_preserves_filters_and_empty_page_is_not_fake_data(): void
    {
        $room = $this->room();
        Room::factory()->count(20)->create(['is_public' => true, 'building_id' => $room->building_id]);
        $query = ['building_id' => $room->building_id, 'sort' => 'price_asc'];
        $first = $this->index($query)->assertOk()->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.total', 21)->assertJsonPath('meta.per_page', 20);
        $second = $this->index([...$query, 'page' => 2])->assertOk()->assertJsonCount(1, 'data');
        $this->assertEmpty(array_intersect($first->json('data.*.id'), $second->json('data.*.id')));
        $this->assertStringContainsString('building_id='.$room->building_id, $first->json('links.next'));
        $this->index([...$query, 'page' => 3])->assertOk()->assertJsonCount(0, 'data');
    }

    public static function invalidFilters(): array
    {
        return [
            'unknown status' => [['status' => 'occupied'], 'status'],
            'override public' => [['is_public' => false], 'is_public'],
            'private relations' => [['include' => 'contracts.user'], 'include'],
            'building array' => [['building_id' => [1]], 'building_id'],
            'building zero' => [['building_id' => 0], 'building_id'],
            'negative price' => [['min_price' => -1], 'min_price'],
            'fraction price' => [['max_price' => '1.01'], 'max_price'],
            'unsafe price' => [['max_price' => '9007199254740992'], 'max_price'],
            'reversed price' => [['min_price' => 10, 'max_price' => 9], 'max_price'],
            'negative area' => [['min_area' => -1], 'min_area'],
            'area precision' => [['max_area' => '25.501'], 'max_area'],
            'large area' => [['max_area' => 1000000], 'max_area'],
            'area array' => [['max_area' => [1]], 'max_area'],
            'reversed area' => [['min_area' => '25.50', 'max_area' => '25.49'], 'max_area'],
            'occupants zero' => [['min_occupants' => 0], 'min_occupants'],
            'occupants max' => [['max_occupants' => 65536], 'max_occupants'],
            'occupants fraction' => [['min_occupants' => '1.5'], 'min_occupants'],
            'reversed occupants' => [['min_occupants' => 3, 'max_occupants' => 2], 'max_occupants'],
            'amenity scalar' => [['amenity_ids' => 1], 'amenity_ids'],
            'amenity duplicate' => [['amenity_ids' => [1, 1]], 'amenity_ids.0'],
            'amenity object' => [['amenity_ids' => ['a' => 1]], 'amenity_ids'],
            'amenity invalid' => [['amenity_ids' => [0]], 'amenity_ids.0'],
            'query too long' => [['q' => str_repeat('x', 192)], 'q'],
            'query array' => [['q' => [1]], 'q'],
            'sort injection' => [['sort' => 'id desc; DROP TABLE users'], 'sort'],
            'page zero' => [['page' => 0], 'page'],
            'page overflow' => [['page' => '9223372036854775807'], 'page'],
        ];
    }

    #[DataProvider('invalidFilters')]
    public function test_invalid_filters_return_vietnamese_validation_errors(array $query, string $field): void
    {
        $this->index($query)->assertUnprocessable()->assertJsonValidationErrors($field);
    }

    public static function roles(): array
    {
        return array_map(fn (UserRole $role) => [$role], UserRole::cases());
    }

    #[DataProvider('roles')]
    public function test_public_policy_is_independent_of_role_but_does_not_open_admin_routes(UserRole $role): void
    {
        $user = User::factory()->role($role)->create();
        $room = $this->room();
        $this->actingAs($user);
        $this->index()->assertOk();
        $this->getJson(self::URL.'/'.$room->id)->assertOk();
        $this->getJson('/api/v1/rooms')->assertStatus($role === UserRole::Admin ? 200 : 403);
        $user->status = UserStatus::Locked;
        $user->save();
        $this->index()->assertOk();
        $this->assertTrue(Gate::forUser($user)->allows('viewPublic', $room));
        $this->assertFalse(Gate::forUser($user)->allows('viewAny', Room::class));
    }

    public function test_anonymous_admin_api_is_still_private_and_public_writes_do_not_exist(): void
    {
        $room = $this->room();
        $this->getJson('/api/v1/rooms')->assertUnauthorized();
        $this->getJson('/api/v1/rooms/'.$room->id)->assertUnauthorized();
        $this->postJson(self::URL, [])->assertMethodNotAllowed();
        $this->patchJson(self::URL.'/'.$room->id, [])->assertMethodNotAllowed();
        $this->deleteJson(self::URL.'/'.$room->id)->assertMethodNotAllowed();
    }

    public function test_queries_eager_load_relations_in_constant_number_of_queries(): void
    {
        $room = $this->room();
        Room::factory()->count(19)->create(['building_id' => $room->building_id, 'is_public' => true]);
        DB::enableQueryLog();
        try {
            $this->index()->assertOk()->assertJsonCount(20, 'data');
            $selects = collect(DB::getQueryLog())->filter(fn (array $q) => str_starts_with(strtolower($q['query']), 'select'));
            $this->assertLessThanOrEqual(10, $selects->count(), 'Không truy vấn riêng từng phòng hoặc tiện nghi (N+1).');
        } finally {
            DB::disableQueryLog();
            DB::flushQueryLog();
        }
    }

    public function test_missing_schema_returns_controlled_service_unavailable(): void
    {
        Schema::shouldReceive('getTableListing')->with(null, false)->andReturn([]);
        $this->index()->assertStatus(503)->assertJsonPath('message', 'Dữ liệu phòng công khai chưa sẵn sàng. Vui lòng thử lại sau.');
        $this->getJson(self::URL.'/1')->assertStatus(503);
        $this->getJson(self::URL.'/filters')->assertStatus(503);
    }
}
