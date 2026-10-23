<?php

namespace Tests\Feature\Catalog;

use App\Enums\RoomStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

/** ROOM-A: thông tin niêm yết độc lập với vòng đời hợp đồng và trạng thái phòng. */
class RoomManagementTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const PASSWORD = 'Room Test Password!42';

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

    private function input(?Building $building = null): array
    {
        $building ??= Building::factory()->create(['total_floors' => 5]);

        return [
            'building_id' => $building->id, 'code' => 'P101', 'floor_number' => 1, 'area' => '25.50',
            'base_price' => 3500000, 'deposit_amount' => 2000000, 'max_occupants' => 3,
            'is_public' => true, 'description' => 'Phòng có cửa sổ',
        ];
    }

    /** @return array<string, array{string, string}> */
    public static function endpoints(): array
    {
        return [
            'list' => ['GET', ''], 'create' => ['POST', ''], 'show' => ['GET', '/%d'],
            'patch' => ['PATCH', '/%d'], 'put' => ['PUT', '/%d'],
        ];
    }

    /** @return array<string, array{string, string, string}> */
    public static function otherRoleEndpoints(): array
    {
        $cases = [];
        foreach (['user', 'resident', 'technician', 'guard'] as $role) {
            foreach (self::endpoints() as $label => $endpoint) {
                $cases[$role.' '.$label] = [...$endpoint, $role];
            }
        }

        return $cases;
    }

    private function uri(string $suffix): string
    {
        return '/api/v1/rooms'.($suffix === '' ? '' : sprintf($suffix, Room::factory()->create()->id));
    }

    #[DataProvider('endpoints')]
    public function test_all_endpoints_require_a_session(string $method, string $suffix): void
    {
        $this->spa($method, $this->uri($suffix), $this->input())->assertUnauthorized();
    }

    #[DataProvider('otherRoleEndpoints')]
    public function test_non_admin_roles_cannot_manage_rooms(string $method, string $suffix, string $role): void
    {
        $this->signIn(UserRole::from($role));
        $this->spa($method, $this->uri($suffix), $this->input())->assertForbidden();
    }

    #[DataProvider('endpoints')]
    public function test_an_admin_locked_after_login_is_rejected(string $method, string $suffix): void
    {
        $user = $this->signIn();
        $user->status = UserStatus::Locked;
        $user->save();
        $this->spa($method, $this->uri($suffix), $this->input())->assertForbidden();
    }

    #[DataProvider('endpoints')]
    public function test_missing_room_schema_returns_503_without_ddl_or_fake_empty_data(string $method, string $suffix): void
    {
        $this->signIn();
        $input = $this->input();
        // Mô phỏng riêng kiểm tra khả dụng, không xóa/đổi tên bảng và không giả response.
        Schema::shouldReceive('hasTable')->with('rooms')->andReturnFalse();
        $response = $this->spa($method, '/api/v1/rooms'.($suffix === '' ? '' : '/999'), $input)
            ->assertStatus(503)->assertJsonStructure(['message']);
        $this->assertArrayNotHasKey('data', $response->json());
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
    }

    public function test_admin_creates_and_reads_exact_room_resource_with_integer_vnd_and_decimal_area(): void
    {
        $this->signIn();
        $building = Building::factory()->create(['total_floors' => 5]);
        $input = $this->input($building);
        $response = $this->spa('POST', '/api/v1/rooms', $input)->assertCreated();
        $id = $response->json('data.id');
        $expected = ['data' => ['id' => $id] + $input + ['building' => ['id' => $building->id, 'name' => $building->name], 'status' => 'available']];
        $response->assertExactJson($expected);
        $this->spa('GET', '/api/v1/rooms/'.$id)->assertOk()->assertExactJson($expected);
        $this->assertDatabaseHas('rooms', $input + ['id' => $id, 'status' => 'available']);
        $this->assertIsInt($response->json('data.base_price'));
        $this->assertIsInt($response->json('data.deposit_amount'));
        $this->assertIsString($response->json('data.area'));
    }

    public function test_empty_list_and_missing_room_are_not_fabricated(): void
    {
        $this->signIn();
        $this->spa('GET', '/api/v1/rooms')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        $this->spa('GET', '/api/v1/rooms/99999999')->assertNotFound()->assertJsonStructure(['message']);
    }

    public function test_lists_paginate_twenty_records_in_id_order(): void
    {
        $this->signIn();
        $building = Building::factory()->create();
        $rooms = Room::factory()->count(21)->create(['building_id' => $building->id]);
        $first = $this->spa('GET', '/api/v1/rooms')->assertOk()->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.total', 21)->assertJsonPath('meta.per_page', 20)->assertJsonStructure(['data', 'links', 'meta']);
        $this->assertSame($rooms->take(20)->pluck('id')->all(), array_column($first->json('data'), 'id'));
        $second = $this->spa('GET', '/api/v1/rooms?page=2')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.current_page', 2);
        $this->assertSame($rooms->last()->id, $second->json('data.0.id'));
        foreach ($first->json('data') as $row) {
            foreach (['tenant', 'user', 'contracts', 'contract_id', 'photos', 'amenities', 'phone', 'email', 'id_number'] as $sensitiveOrFakeField) {
                $this->assertArrayNotHasKey($sensitiveOrFakeField, $row);
            }
        }
    }

    public function test_lists_filter_building_status_and_search_together(): void
    {
        $this->signIn();
        $building = Building::factory()->create();
        $wanted = Room::factory()->create(['building_id' => $building->id, 'code' => 'SEARCH-101']);
        Room::factory()->create(['building_id' => $building->id, 'code' => 'OTHER-202']);
        $occupied = Room::factory()->create(['building_id' => $building->id, 'code' => 'SEARCH-303']);
        $occupied->status = RoomStatus::Occupied;
        $occupied->save();
        Room::factory()->create(['code' => 'SEARCH-404']);
        $this->spa('GET', '/api/v1/rooms?'.http_build_query(['building_id' => $building->id, 'status' => 'available', 'q' => 'SEARCH']))
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $wanted->id)->assertJsonPath('meta.total', 1);
        $this->spa('GET', '/api/v1/rooms?building_id='.$building->id)->assertOk()->assertJsonCount(3, 'data');
        $this->spa('GET', '/api/v1/rooms?status=occupied')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $occupied->id);
    }

    /** @return array<string, array{array, string}> */
    public static function invalidFilters(): array
    {
        return [
            'unknown status' => [['status' => 'invented'], 'status'],
            'invalid building' => [['building_id' => 'abc'], 'building_id'],
            'long search' => [['q' => str_repeat('a', 51)], 'q'],
            'invalid page' => [['page' => 0], 'page'],
        ];
    }

    #[DataProvider('invalidFilters')]
    public function test_invalid_list_filters_have_field_errors(array $filters, string $field): void
    {
        $this->signIn();
        $this->spa('GET', '/api/v1/rooms?'.http_build_query($filters))->assertUnprocessable()->assertJsonValidationErrors($field);
    }

    public function test_room_codes_are_unique_per_building_not_globally(): void
    {
        $this->signIn();
        $first = Building::factory()->create(['total_floors' => 5]);
        $second = Building::factory()->create(['total_floors' => 5]);
        $this->spa('POST', '/api/v1/rooms', $this->input($first))->assertCreated();
        $this->spa('POST', '/api/v1/rooms', $this->input($first))->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->spa('POST', '/api/v1/rooms', $this->input($second))->assertCreated();
        $this->assertDatabaseCount('rooms', 2);
    }

    /** @return array<string, array{string}> */
    public static function updateMethods(): array
    {
        return ['patch' => ['PATCH'], 'put' => ['PUT']];
    }

    #[DataProvider('updateMethods')]
    public function test_admin_updates_room_metadata_without_changing_contract_snapshot_or_room_status(string $method): void
    {
        $this->signIn();
        $building = Building::factory()->create(['total_floors' => 5]);
        $room = Room::factory()->create(['building_id' => $building->id, 'code' => 'P101']);
        $room->status = RoomStatus::Occupied;
        $room->save();
        $contract = Contract::factory()->active()->create(['room_id' => $room->id, 'monthly_rent' => 3500000, 'deposit_amount' => 3500000]);
        $before = (array) DB::table('contracts')->find($contract->id);
        $input = array_replace($this->input($building), ['code' => 'P101', 'base_price' => 4700000, 'deposit_amount' => 4200000, 'floor_number' => 3, 'description' => 'Thông tin niêm yết mới']);
        $this->spa($method, '/api/v1/rooms/'.$room->id, $input)->assertOk()->assertJsonPath('data.status', 'occupied')->assertJsonPath('data.base_price', 4700000);
        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'floor_number' => 3, 'status' => 'occupied']);
        $this->assertSame($before, (array) DB::table('contracts')->find($contract->id));
        $detail = $this->spa('GET', '/api/v1/rooms/'.$room->id)->assertOk()->json('data');
        $this->assertArrayNotHasKey('contracts', $detail);
        $this->assertArrayNotHasKey('tenant', $detail);
    }

    public function test_update_rejects_another_building_and_conflicting_code(): void
    {
        $this->signIn();
        $building = Building::factory()->create();
        $first = Room::factory()->create(['building_id' => $building->id, 'code' => 'P101']);
        $second = Room::factory()->create(['building_id' => $building->id, 'code' => 'P102']);
        $other = Building::factory()->create();
        $this->spa('PATCH', '/api/v1/rooms/'.$first->id, ['building_id' => $other->id])->assertUnprocessable()->assertJsonValidationErrors('building_id');
        $this->spa('PATCH', '/api/v1/rooms/'.$first->id, ['code' => $second->code])->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->assertSame($building->id, $first->fresh()->building_id);
        $this->assertSame('P101', $first->fresh()->code);
    }

    /** @return array<string, array{array, string}> */
    public static function invalidInputs(): array
    {
        return [
            'missing building' => [['building_id' => null], 'building_id'], 'unknown building' => [['building_id' => 99999999], 'building_id'],
            'empty code' => [['code' => ''], 'code'], 'long code' => [['code' => str_repeat('P', 51)], 'code'],
            'array code' => [['code' => []], 'code'], 'zero floor' => [['floor_number' => 0], 'floor_number'],
            'negative floor' => [['floor_number' => -1], 'floor_number'], 'fractional floor' => [['floor_number' => 1.5], 'floor_number'],
            'floor above building' => [['floor_number' => 6], 'floor_number'],
            'zero area' => [['area' => '0'], 'area'], 'negative area' => [['area' => '-0.01'], 'area'],
            'invalid area' => [['area' => 'wide'], 'area'], 'area precision' => [['area' => '12.345'], 'area'],
            'area overflow' => [['area' => '1000000.00'], 'area'],
            'negative rent' => [['base_price' => -1], 'base_price'], 'fractional rent' => [['base_price' => 1000.25], 'base_price'],
            'unsafe JSON rent' => [['base_price' => 9007199254740992], 'base_price'],
            'negative deposit' => [['deposit_amount' => -1], 'deposit_amount'], 'fractional deposit' => [['deposit_amount' => 1000.25], 'deposit_amount'],
            'unsafe JSON deposit' => [['deposit_amount' => 9007199254740992], 'deposit_amount'],
            'zero capacity' => [['max_occupants' => 0], 'max_occupants'], 'capacity overflow' => [['max_occupants' => 65536], 'max_occupants'],
            'invalid publication' => [['is_public' => 'yes'], 'is_public'], 'invalid description' => [['description' => []], 'description'],
            'status override' => [['status' => 'occupied'], 'status'], 'null status override' => [['status' => null], 'status'],
            'photos override' => [['photos' => ['fake.jpg']], 'photos'], 'amenities override' => [['amenity_ids' => [1]], 'amenity_ids'],
            'contract override' => [['contracts' => []], 'contracts'], 'id override' => [['id' => 77], 'id'],
        ];
    }

    #[DataProvider('invalidInputs')]
    public function test_invalid_or_privileged_room_input_is_rejected_without_inserting(array $extra, string $field): void
    {
        $this->signIn();
        $this->spa('POST', '/api/v1/rooms', array_replace($this->input(), $extra))->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('rooms', 0);
    }

    public function test_boundary_values_keep_decimal_area_and_zero_whole_vnd_prices(): void
    {
        $this->signIn();
        $building = Building::factory()->create(['total_floors' => 65535]);
        $this->spa('POST', '/api/v1/rooms', array_replace($this->input($building), [
            'code' => str_repeat('P', 50), 'floor_number' => 65535, 'area' => '999999.99',
            'base_price' => 0, 'deposit_amount' => 0, 'max_occupants' => 65535,
        ]))->assertCreated()->assertJsonPath('data.area', '999999.99')->assertJsonPath('data.base_price', 0)->assertJsonPath('data.deposit_amount', 0)->assertJsonPath('data.max_occupants', 65535);
        $this->spa('POST', '/api/v1/rooms', array_replace($this->input($building), ['code' => 'SMALL', 'area' => '0.01']))
            ->assertCreated()->assertJsonPath('data.area', '0.01');
    }

    public function test_protected_room_fields_cannot_be_updated_or_physically_deleted(): void
    {
        $this->signIn();
        $room = Room::factory()->create();
        $this->spa('PATCH', '/api/v1/rooms/'.$room->id, ['status' => 'inactive', 'base_price' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->assertSame(3500000, $room->fresh()->base_price);
        $this->assertSame(RoomStatus::Available, $room->fresh()->status);
        $this->spa('DELETE', '/api/v1/rooms/'.$room->id)->assertStatus(405);
        $this->assertDatabaseHas('rooms', ['id' => $room->id]);
    }

    public function test_real_unique_constraint_race_returns_safe_conflict(): void
    {
        $this->signIn();
        $input = $this->input();
        Event::listen('eloquent.creating: '.Room::class, function (Room $room): void {
            DB::table('rooms')->insert([
                'building_id' => $room->building_id, 'code' => $room->code, 'floor_number' => 1,
                'area' => '20.00', 'base_price' => 1, 'deposit_amount' => 0, 'max_occupants' => 1,
                'status' => 'available', 'is_public' => false, 'created_at' => now(), 'updated_at' => now(),
            ]);
        });
        $response = $this->spa('POST', '/api/v1/rooms', $input)->assertConflict()->assertJsonStructure(['message']);
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertStringNotContainsString('Duplicate entry', $response->getContent());
        // Cả INSERT cạnh tranh trong test nằm cùng transaction; lỗi UNIQUE phải rollback toàn bộ.
        $this->assertDatabaseCount('rooms', 0);
    }

    /** @return array<string, array{string}> */
    public static function overflowingDescriptions(): array
    {
        return [
            'ASCII' => [str_repeat('a', 65536)],
            'tiếng Việt UTF-8' => [str_repeat('ế', 21846)],
        ];
    }

    #[DataProvider('overflowingDescriptions')]
    public function test_overlong_room_description_returns_field_error_without_creating_or_corrupting_data(string $description): void
    {
        $this->signIn();
        $existing = Room::factory()->create(['description' => 'Nội dung phải được giữ nguyên']);
        $input = array_replace($this->input(), ['description' => $description]);
        $this->spa('POST', '/api/v1/rooms', $input)->assertUnprocessable()->assertJsonValidationErrors('description');
        $this->assertDatabaseCount('rooms', 1);
        $this->spa('PATCH', '/api/v1/rooms/'.$existing->id, ['description' => $description])
            ->assertUnprocessable()->assertJsonValidationErrors('description');
        $this->assertSame('Nội dung phải được giữ nguyên', $existing->fresh()->description);
    }

    /** @return array<string, array{string}> */
    public static function boundaryDescriptions(): array
    {
        return [
            'ASCII' => [str_repeat('a', 65535)],
            'tiếng Việt UTF-8' => [str_repeat('ế', 21845)],
        ];
    }

    #[DataProvider('boundaryDescriptions')]
    public function test_room_description_at_text_capacity_is_saved_without_truncation(string $description): void
    {
        $this->signIn();
        $id = $this->spa('POST', '/api/v1/rooms', array_replace($this->input(), ['description' => $description]))
            ->assertCreated()->json('data.id');
        $saved = DB::table('rooms')->where('id', $id)->value('description');
        $this->assertSame($description, $saved);
        $this->assertSame(65535, strlen($saved));
    }

    public static function booleanMoney(): array
    {
        return [
            'price true' => ['base_price', true],
            'price false' => ['base_price', false],
            'deposit true' => ['deposit_amount', true],
            'deposit false' => ['deposit_amount', false],
        ];
    }

    #[DataProvider('booleanMoney')]
    public function test_boolean_is_not_accepted_as_money(string $field, bool $value): void
    {
        $this->signIn();
        $input = $this->input();
        $this->spa('POST', '/api/v1/rooms', array_replace($input, [$field => $value]))
            ->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('rooms', 0);
        $room = Room::factory()->create(['building_id' => $input['building_id']]);
        $original = $room->getRawOriginal($field);
        $this->spa('PATCH', '/api/v1/rooms/'.$room->id, [$field => $value])
            ->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertSame($original, $room->fresh()->getRawOriginal($field));
    }
}
