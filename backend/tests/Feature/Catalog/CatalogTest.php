<?php

namespace Tests\Feature\Catalog;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Amenity;
use App\Models\Building;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

/** CAT-A: kiểm tra API thật với cookie phiên và MySQL test, không dùng actingAs. */
class CatalogTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const PASSWORD = 'Catalog Test Password!42';

    private const BUILDING = ['name' => 'Tòa Bình An', 'address' => '12 Nguyễn Trãi', 'total_floors' => 5];

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => self::PASSWORD]);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => self::PASSWORD])
            ->assertOk()->assertJsonPath('data.role', $role->value);

        return $user;
    }

    /** @return array<string, array{string, string, string}> */
    public static function endpoints(): array
    {
        $cases = [];
        foreach (['buildings', 'amenities'] as $resource) {
            foreach (['list' => ['GET', ''], 'create' => ['POST', ''], 'show' => ['GET', '/%d'], 'patch' => ['PATCH', '/%d'], 'put' => ['PUT', '/%d']] as $action => [$method, $suffix]) {
                $cases[$resource.' '.$action] = [$method, $resource, $suffix];
            }
        }
        $cases['amenities archive'] = ['DELETE', 'amenities', '/%d'];

        return $cases;
    }

    /** @return array<string, array{string, string, string, string}> */
    public static function nonAdminEndpoints(): array
    {
        $cases = [];
        foreach (['user', 'resident', 'technician', 'guard'] as $role) {
            foreach (self::endpoints() as $label => $endpoint) {
                $cases[$role.' '.$label] = [...$endpoint, $role];
            }
        }

        return $cases;
    }

    private function endpoint(string $resource, string $suffix): string
    {
        $model = $resource === 'buildings' ? Building::factory()->create() : Amenity::factory()->create();

        return '/api/v1/'.$resource.($suffix === '' ? '' : sprintf($suffix, $model->id));
    }

    private function payload(string $resource): array
    {
        return $resource === 'buildings' ? self::BUILDING : ['name' => 'Internet', 'description' => 'Tiện nghi không sinh khoản thu'];
    }

    #[DataProvider('endpoints')]
    public function test_every_endpoint_rejects_anonymous_requests(string $method, string $resource, string $suffix): void
    {
        $this->spa($method, $this->endpoint($resource, $suffix), $this->payload($resource))->assertUnauthorized();
    }

    #[DataProvider('nonAdminEndpoints')]
    public function test_every_endpoint_rejects_other_roles(string $method, string $resource, string $suffix, string $role): void
    {
        $this->signIn(UserRole::from($role));
        $this->spa($method, $this->endpoint($resource, $suffix), $this->payload($resource))->assertForbidden();
    }

    #[DataProvider('endpoints')]
    public function test_every_endpoint_rechecks_a_locked_admin_session(string $method, string $resource, string $suffix): void
    {
        $user = $this->signIn();
        $user->status = UserStatus::Locked;
        $user->save();
        $this->spa($method, $this->endpoint($resource, $suffix), $this->payload($resource))->assertForbidden();
    }

    public function test_admin_creates_and_reads_building_with_only_real_resource_fields(): void
    {
        $this->signIn();
        $response = $this->spa('POST', '/api/v1/buildings', self::BUILDING + ['latitude' => '10.1234567', 'longitude' => '106.7654321', 'description' => 'Mô tả tòa']);
        $id = $response->assertCreated()->json('data.id');
        $expected = ['data' => ['id' => $id] + self::BUILDING + ['latitude' => '10.1234567', 'longitude' => '106.7654321', 'description' => 'Mô tả tòa', 'status' => 'active']];
        $response->assertExactJson($expected);
        $this->spa('GET', '/api/v1/buildings/'.$id)->assertOk()->assertExactJson($expected);
        $this->assertDatabaseHas('buildings', self::BUILDING + ['id' => $id, 'status' => 'active']);
    }

    public function test_optional_building_values_are_null_and_unknown_input_is_not_persisted(): void
    {
        $this->signIn();
        $response = $this->spa('POST', '/api/v1/buildings', self::BUILDING + ['unexpected_client_field' => 'not stored'])->assertCreated();
        $response->assertJsonPath('data.latitude', null)->assertJsonPath('data.longitude', null)->assertJsonPath('data.description', null);
        $this->assertArrayNotHasKey('unexpected_client_field', $response->json('data'));
    }

    /** @return array<string, array{string, string}> */
    public static function resources(): array
    {
        return ['buildings' => ['buildings', Building::class], 'amenities' => ['amenities', Amenity::class]];
    }

    #[DataProvider('resources')]
    public function test_lists_are_paginated_without_fabricated_counts(string $resource, string $model): void
    {
        $this->signIn();
        $model::factory()->count(21)->create();
        $first = $this->spa('GET', '/api/v1/'.$resource)->assertOk()->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.total', 21)->assertJsonPath('meta.per_page', 20)->assertJsonPath('meta.current_page', 1)
            ->assertJsonStructure(['data', 'links', 'meta']);
        $second = $this->spa('GET', '/api/v1/'.$resource.'?page=2')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.current_page', 2);
        $this->assertEmpty(array_intersect(array_column($first->json('data'), 'id'), array_column($second->json('data'), 'id')));
        foreach ($first->json('data') as $row) {
            foreach (['rooms_count', 'room_count', 'usage_count', 'building_count', 'image', 'amenities'] as $fakeField) {
                $this->assertArrayNotHasKey($fakeField, $row);
            }
        }
    }

    #[DataProvider('resources')]
    public function test_empty_lists_and_missing_records_have_honest_responses(string $resource, string $model): void
    {
        $this->signIn();
        $this->spa('GET', '/api/v1/'.$resource)->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        $this->spa('GET', '/api/v1/'.$resource.'/999999999')->assertNotFound()->assertJsonStructure(['message']);
    }

    /** @return array<string, array{string}> */
    public static function updateMethods(): array
    {
        return ['patch' => ['PATCH'], 'put' => ['PUT']];
    }

    #[DataProvider('updateMethods')]
    public function test_admin_updates_building_and_can_keep_its_own_unique_name(string $method): void
    {
        $this->signIn();
        $building = Building::factory()->create(['total_floors' => 5]);
        $this->spa($method, '/api/v1/buildings/'.$building->id, [
            'name' => $building->name, 'address' => 'Địa chỉ mới', 'total_floors' => 6,
            'latitude' => '-90', 'longitude' => '180', 'description' => 'Đã cập nhật',
        ])->assertOk()->assertJsonPath('data.latitude', '-90.0000000')->assertJsonPath('data.longitude', '180.0000000');
        $this->assertDatabaseHas('buildings', ['id' => $building->id, 'address' => 'Địa chỉ mới', 'total_floors' => 6, 'description' => 'Đã cập nhật']);
        $this->spa('GET', '/api/v1/buildings/'.$building->id)->assertOk()->assertJsonPath('data.total_floors', 6);
    }

    public function test_building_floors_cannot_be_lowered_below_an_existing_room(): void
    {
        $this->signIn();
        $building = Building::factory()->create(['total_floors' => 6]);
        Room::factory()->create(['building_id' => $building->id, 'floor_number' => 4]);
        $this->spa('PATCH', '/api/v1/buildings/'.$building->id, ['total_floors' => 3])->assertUnprocessable()->assertJsonValidationErrors('total_floors');
        $this->assertSame(6, $building->fresh()->total_floors);
        $this->spa('PATCH', '/api/v1/buildings/'.$building->id, ['total_floors' => 4])->assertOk()->assertJsonPath('data.total_floors', 4);
    }

    /** @return array<string, array{array, string}> */
    public static function invalidBuildings(): array
    {
        return [
            'empty name' => [['name' => ''], 'name'], 'long name' => [['name' => str_repeat('a', 151)], 'name'],
            'array name' => [['name' => []], 'name'], 'empty address' => [['address' => ''], 'address'],
            'long address' => [['address' => str_repeat('a', 501)], 'address'],
            'zero floors' => [['total_floors' => 0], 'total_floors'], 'negative floors' => [['total_floors' => -1], 'total_floors'],
            'fractional floors' => [['total_floors' => 2.5], 'total_floors'], 'overflow floors' => [['total_floors' => 65536], 'total_floors'],
            'invalid latitude' => [['latitude' => 'abc'], 'latitude'], 'latitude too high' => [['latitude' => 90.1], 'latitude'],
            'latitude too low' => [['latitude' => -90.1], 'latitude'], 'longitude too high' => [['longitude' => 180.1], 'longitude'],
            'longitude too low' => [['longitude' => -180.1], 'longitude'], 'array description' => [['description' => []], 'description'],
            'status override' => [['status' => 'inactive'], 'status'], 'null status override' => [['status' => null], 'status'],
            'pivot override' => [['amenity_ids' => [1]], 'amenity_ids'], 'identity override' => [['id' => 123], 'id'],
        ];
    }

    #[DataProvider('invalidBuildings')]
    public function test_building_validation_rejects_invalid_and_protected_fields(array $extra, string $field): void
    {
        $this->signIn();
        $this->spa('POST', '/api/v1/buildings', array_replace(self::BUILDING, $extra))->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('buildings', 0);
    }

    public function test_building_maximum_lengths_and_floor_limit_are_supported(): void
    {
        $this->signIn();
        $this->spa('POST', '/api/v1/buildings', ['name' => str_repeat('a', 150), 'address' => str_repeat('b', 500), 'total_floors' => 65535])
            ->assertCreated()->assertJsonPath('data.total_floors', 65535);
    }

    #[DataProvider('resources')]
    public function test_duplicate_names_are_rejected_on_create_and_update(string $resource, string $model): void
    {
        $this->signIn();
        $first = $model::factory()->create(['name' => 'Tên đã tồn tại']);
        $second = $model::factory()->create(['name' => 'Tên thứ hai']);
        $this->spa('POST', '/api/v1/'.$resource, array_replace($this->payload($resource), ['name' => $first->name]))
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->spa('PATCH', '/api/v1/'.$resource.'/'.$second->id, ['name' => $first->name])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->assertSame('Tên thứ hai', $second->fresh()->name);
        $this->assertDatabaseCount($resource, 2);
    }

    public function test_admin_creates_updates_and_archives_amenities_without_removing_links(): void
    {
        $this->signIn();
        $create = $this->spa('POST', '/api/v1/amenities', ['name' => 'Thang máy', 'description' => 'Phục vụ đi lại'])->assertCreated();
        $id = $create->json('data.id');
        $create->assertExactJson(['data' => ['id' => $id, 'name' => 'Thang máy', 'description' => 'Phục vụ đi lại']]);
        $this->spa('PUT', '/api/v1/amenities/'.$id, ['name' => 'Thang máy', 'description' => null])->assertOk()->assertJsonPath('data.description', null);
        $this->spa('PATCH', '/api/v1/amenities/'.$id, ['name' => 'Thang máy mới'])->assertOk();
        $building = Building::factory()->create();
        $room = Room::factory()->create(['building_id' => $building->id]);
        $building->amenities()->attach($id);
        $room->amenities()->attach($id);
        $this->spa('DELETE', '/api/v1/amenities/'.$id)->assertNoContent();
        $this->assertSoftDeleted('amenities', ['id' => $id, 'name' => 'Thang máy mới']);
        $this->assertDatabaseHas('building_amenities', ['building_id' => $building->id, 'amenity_id' => $id]);
        $this->assertDatabaseHas('room_amenities', ['room_id' => $room->id, 'amenity_id' => $id]);
        $this->spa('GET', '/api/v1/amenities')->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/amenities/'.$id)->assertNotFound();
        $this->spa('PATCH', '/api/v1/amenities/'.$id, ['description' => 'Không được sửa bản lưu trữ'])->assertNotFound();
        $this->spa('DELETE', '/api/v1/amenities/'.$id)->assertNotFound();
        $this->spa('POST', '/api/v1/amenities', ['name' => 'Thang máy mới'])->assertUnprocessable()->assertJsonValidationErrors('name');
        $other = Amenity::factory()->create();
        $this->spa('PATCH', '/api/v1/amenities/'.$other->id, ['name' => 'Thang máy mới'])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->assertSame(2, Amenity::withTrashed()->count());
    }

    /** @return array<string, array{array, string}> */
    public static function invalidAmenities(): array
    {
        return [
            'empty name' => [['name' => ''], 'name'], 'long name' => [['name' => str_repeat('a', 121)], 'name'],
            'array description' => [['description' => []], 'description'], 'category override' => [['category' => 'money'], 'category'],
            'status override' => [['status' => 'active'], 'status'], 'price override' => [['price' => 100000], 'price'],
            'billing override' => [['billing_type' => 'per_room'], 'billing_type'], 'link override' => [['building_ids' => [1]], 'building_ids'],
            'archive override' => [['deleted_at' => now()->toISOString()], 'deleted_at'],
        ];
    }

    #[DataProvider('invalidAmenities')]
    public function test_amenity_validation_does_not_accept_category_money_or_privileged_fields(array $extra, string $field): void
    {
        $this->signIn();
        $this->spa('POST', '/api/v1/amenities', array_replace(['name' => 'Internet'], $extra))->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('amenities', 0);
    }

    #[DataProvider('resources')]
    public function test_real_unique_constraint_race_returns_safe_409(string $resource, string $model): void
    {
        $this->signIn();
        // Chèn cạnh tranh sau bước unique validation, trước INSERT Eloquent.
        // MySQL thật phát hiện vi phạm UNIQUE; không giả lập exception SQL.
        Event::listen('eloquent.creating: '.$model, function ($record) use ($resource): void {
            $data = ['name' => $record->name, 'created_at' => now(), 'updated_at' => now()];
            if ($resource === 'buildings') {
                $data += ['address' => 'Bản ghi cạnh tranh', 'total_floors' => 1, 'status' => 'active'];
            }
            DB::table($resource)->insert($data);
        });
        $response = $this->spa('POST', '/api/v1/'.$resource, $this->payload($resource))->assertConflict()->assertJsonStructure(['message']);
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertStringNotContainsString('Duplicate entry', $response->getContent());
        $this->assertDatabaseCount($resource, 1);
    }

    /** @return array<string, array{string, string, string}> */
    public static function overflowingDescriptions(): array
    {
        $cases = [];
        foreach (self::resources() as $resource => [$name, $model]) {
            $cases[$resource.' ASCII'] = [$name, $model, str_repeat('a', 65536)];
            $cases[$resource.' tiếng Việt UTF-8'] = [$name, $model, str_repeat('ế', 21846)];
        }

        return $cases;
    }

    #[DataProvider('overflowingDescriptions')]
    public function test_overlong_description_returns_field_error_and_preserves_existing_data(string $resource, string $model, string $description): void
    {
        $this->signIn();
        $existing = $model::factory()->create(['description' => 'Nội dung phải được giữ nguyên']);
        $this->spa('POST', '/api/v1/'.$resource, array_replace($this->payload($resource), ['description' => $description]))
            ->assertUnprocessable()->assertJsonValidationErrors('description');
        $this->assertDatabaseCount($resource, 1);
        $this->spa('PATCH', '/api/v1/'.$resource.'/'.$existing->id, ['description' => $description])
            ->assertUnprocessable()->assertJsonValidationErrors('description');
        $this->assertSame('Nội dung phải được giữ nguyên', $existing->fresh()->description);
    }

    /** @return array<string, array{string, string}> */
    public static function boundaryDescriptions(): array
    {
        return [
            'buildings ASCII' => ['buildings', str_repeat('a', 65535)],
            'buildings tiếng Việt UTF-8' => ['buildings', str_repeat('ế', 21845)],
            'amenities ASCII' => ['amenities', str_repeat('a', 65535)],
            'amenities tiếng Việt UTF-8' => ['amenities', str_repeat('ế', 21845)],
        ];
    }

    #[DataProvider('boundaryDescriptions')]
    public function test_description_at_text_capacity_is_saved_without_truncation(string $resource, string $description): void
    {
        $this->signIn();
        $input = array_replace($this->payload($resource), ['description' => $description]);
        $id = $this->spa('POST', '/api/v1/'.$resource, $input)->assertCreated()->json('data.id');
        $saved = DB::table($resource)->where('id', $id)->value('description');
        $this->assertSame($description, $saved);
        $this->assertSame(65535, strlen($saved));
    }
}
