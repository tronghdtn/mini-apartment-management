<?php

namespace Tests\Feature\Catalog;

use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Contract;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ServiceCatalogTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const INPUT = ['code' => 'INTERNET', 'name' => 'Internet cáp quang', 'billing_type' => 'per_room', 'unit' => 'phòng', 'price' => 100000, 'description' => 'Gói mạng'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Service Test!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => 'Service Test!42'])->assertOk();

        return $user;
    }

    /** @return array<string,array{string,string}> */
    public static function endpoints(): array
    {
        return ['list' => ['GET', ''], 'create' => ['POST', ''], 'show' => ['GET', '/%d'], 'patch' => ['PATCH', '/%d'], 'put' => ['PUT', '/%d']];
    }

    /** @return array<string,array{string,string,string}> */
    public static function roleEndpoints(): array
    {
        $cases = [];
        foreach (['anonymous', 'user', 'resident', 'technician', 'guard', 'locked'] as $role) {
            foreach (self::endpoints() as $label => $endpoint) {
                $cases[$role.' '.$label] = [...$endpoint, $role];
            }
        }

        return $cases;
    }

    #[DataProvider('roleEndpoints')]
    public function test_every_endpoint_checks_session_role_and_current_account_status(string $method, string $suffix, string $role): void
    {
        $service = Service::factory()->create();
        if ($role !== 'anonymous') {
            $user = $this->signIn($role === 'locked' ? UserRole::Admin : UserRole::from($role));
            if ($role === 'locked') {
                $user->status = UserStatus::Locked;
                $user->save();
            }
        }
        $this->spa($method, '/api/v1/services'.($suffix === '' ? '' : sprintf($suffix, $service->id)), self::INPUT)
            ->assertStatus($role === 'anonymous' ? 401 : 403);
    }

    /** @return array<string,array{string}> */
    public static function ordinaryTypes(): array
    {
        return ['room' => ['per_room'], 'person' => ['per_person'], 'unit' => ['per_unit']];
    }

    #[DataProvider('ordinaryTypes')]
    public function test_creates_each_ordinary_type_with_normalized_code_and_exact_resource(string $type): void
    {
        $this->signIn();
        $response = $this->spa('POST', '/api/v1/services', array_replace(self::INPUT, ['code' => '  internet  ', 'billing_type' => $type]))->assertCreated();
        $id = $response->json('data.id');
        $expected = ['data' => ['id' => $id] + array_replace(self::INPUT, ['billing_type' => $type]) + ['status' => 'active']];
        $response->assertExactJson($expected);
        $this->spa('GET', '/api/v1/services/'.$id)->assertOk()->assertExactJson($expected);
        $this->assertIsInt($response->json('data.price'));
    }

    public function test_empty_paginated_list_and_missing_id_return_real_state(): void
    {
        $this->signIn();
        $this->spa('GET', '/api/v1/services')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        $this->spa('GET', '/api/v1/services/9999999')->assertNotFound();
        Service::factory()->count(21)->create();
        $first = $this->spa('GET', '/api/v1/services')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 21)->assertJsonStructure(['links', 'meta']);
        $second = $this->spa('GET', '/api/v1/services?page=2')->assertOk()->assertJsonCount(1, 'data');
        $this->assertGreaterThan($first->json('data.19.id'), $second->json('data.0.id'));
    }

    public function test_inactive_names_and_codes_still_prevent_duplicate_creation_and_update(): void
    {
        $this->signIn();
        $service = Service::factory()->create(['code' => 'INTERNET', 'name' => self::INPUT['name']]);
        $service->status = ServiceStatus::Inactive;
        $service->save();
        foreach ([['code' => 'internet', 'name' => 'Tên khác'], ['code' => 'OTHER', 'name' => $service->name]] as $input) {
            $this->spa('POST', '/api/v1/services', array_replace(self::INPUT, $input))->assertUnprocessable()->assertJsonValidationErrors($input['code'] === 'OTHER' ? 'name' : 'code');
        }
        $other = Service::factory()->create();
        $this->spa('PATCH', '/api/v1/services/'.$other->id, ['name' => $service->name])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->assertDatabaseCount('services', 2);
    }

    public function test_updating_list_price_does_not_change_contract_service_snapshot(): void
    {
        $this->signIn();
        $service = Service::factory()->create(['price' => 100000]);
        $contract = Contract::factory()->create();
        $id = DB::table('contract_services')->insertGetId(['contract_id' => $contract->id, 'service_id' => $service->id, 'quantity' => '2.00', 'unit_price' => 90000, 'start_date' => '2026-10-01', 'created_at' => now(), 'updated_at' => now()]);
        $snapshot = (array) DB::table('contract_services')->find($id);
        $this->spa('PATCH', '/api/v1/services/'.$service->id, ['name' => $service->name, 'price' => 200000, 'description' => 'Giá niêm yết mới'])
            ->assertOk()->assertJsonPath('data.price', 200000);
        $this->spa('PUT', '/api/v1/services/'.$service->id, ['name' => 'Tên mới', 'description' => null])->assertOk()->assertJsonPath('data.description', null);
        $this->assertSame($snapshot, (array) DB::table('contract_services')->find($id));
        $this->assertSame(200000, $service->fresh()->price);
    }

    /** @return array<string,array{array,string}> */
    public static function invalidInput(): array
    {
        return [
            'empty name' => [['name' => ''], 'name'], 'long name' => [['name' => str_repeat('a', 121)], 'name'],
            'empty code' => [['code' => ''], 'code'], 'metered' => [['billing_type' => 'metered'], 'billing_type'],
            'reserved electricity' => [['code' => ' electricity '], 'code'], 'reserved water' => [['code' => 'water'], 'code'],
            'bad type' => [['billing_type' => 'invented'], 'billing_type'], 'long unit' => [['unit' => str_repeat('a', 21)], 'unit'],
            'negative price' => [['price' => -1], 'price'], 'fraction price' => [['price' => 1.25], 'price'],
            'boolean true price' => [['price' => true], 'price'], 'boolean false price' => [['price' => false], 'price'],
            'unsafe price' => [['price' => 9007199254740992], 'price'], 'null price' => [['price' => null], 'price'],
            'status' => [['status' => 'inactive'], 'status'], 'null status' => [['status' => null], 'status'],
            'id' => [['id' => 42], 'id'], 'description array' => [['description' => []], 'description'],
            'ASCII overflow' => [['description' => str_repeat('a', 65536)], 'description'],
            'UTF8 overflow' => [['description' => str_repeat('ế', 21846)], 'description'],
        ];
    }

    #[DataProvider('invalidInput')]
    public function test_creation_rejects_invalid_reserved_and_privileged_fields(array $extra, string $field): void
    {
        $this->signIn();
        $this->spa('POST', '/api/v1/services', array_replace(self::INPUT, $extra))->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseCount('services', 0);
    }

    /** @return array<string,array{string,mixed}> */
    public static function immutableFields(): array
    {
        return ['code' => ['code', 'NEW'], 'type' => ['billing_type', 'per_unit'], 'unit' => ['unit', 'lượt'], 'status' => ['status', 'inactive'], 'null code' => ['code', null], 'null unit' => ['unit', null], 'null status' => ['status', null]];
    }

    #[DataProvider('immutableFields')]
    public function test_update_rejects_immutable_fields_without_partial_update(string $field, mixed $value): void
    {
        $this->signIn();
        $service = Service::factory()->create();
        $this->spa('PATCH', '/api/v1/services/'.$service->id, [$field => $value, 'name' => 'Không được lưu'])
            ->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertNotSame('Không được lưu', $service->fresh()->name);
    }

    public function test_metered_price_cannot_be_set_directly_and_no_delete_endpoint_exists(): void
    {
        $this->signIn();
        $service = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $this->spa('PATCH', '/api/v1/services/'.$service->id, ['price' => 3500])->assertUnprocessable()->assertJsonValidationErrors('price');
        $this->assertNull($service->fresh()->price);
        $this->spa('DELETE', '/api/v1/services/'.$service->id)->assertStatus(405);
    }

    public function test_update_rejects_boolean_price_and_text_overflow_without_partial_changes(): void
    {
        $this->signIn();
        $service = Service::factory()->create(['description' => 'Giữ nguyên', 'price' => 100000]);
        foreach ([true, false] as $price) {
            $this->spa('PATCH', '/api/v1/services/'.$service->id, ['price' => $price])->assertUnprocessable()->assertJsonValidationErrors('price');
        }
        foreach ([str_repeat('a', 65536), str_repeat('ế', 21846)] as $description) {
            $this->spa('PATCH', '/api/v1/services/'.$service->id, ['description' => $description, 'price' => 1])->assertUnprocessable()->assertJsonValidationErrors('description');
        }
        $this->assertSame('Giữ nguyên', $service->fresh()->description);
        $this->assertSame(100000, $service->fresh()->price);
    }

    public function test_zero_price_and_text_capacity_are_saved_without_truncation(): void
    {
        $this->signIn();
        foreach (['a'.str_repeat('b', 65534), str_repeat('ế', 21845)] as $index => $description) {
            $input = array_replace(self::INPUT, ['code' => 'LIMIT'.$index, 'name' => 'Biên '.$index, 'price' => 0, 'description' => $description, 'unit' => null]);
            $id = $this->spa('POST', '/api/v1/services', $input)->assertCreated()->assertJsonPath('data.price', 0)->json('data.id');
            $this->assertSame($description, Service::findOrFail($id)->description);
        }
    }

    public function test_real_database_unique_race_returns_409_without_sql_details(): void
    {
        $this->signIn();
        Event::listen('eloquent.creating: '.Service::class, function (Service $service): void {
            DB::table('services')->insert(['code' => $service->code, 'name' => 'Dòng cạnh tranh', 'billing_type' => 'per_room', 'price' => 0, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
        });
        $response = $this->spa('POST', '/api/v1/services', self::INPUT)->assertConflict()->assertJsonStructure(['message']);
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertStringNotContainsString('Duplicate entry', $response->getContent());
    }
}
