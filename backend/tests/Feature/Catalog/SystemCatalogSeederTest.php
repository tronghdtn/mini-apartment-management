<?php

namespace Tests\Feature\Catalog;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\SystemCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class SystemCatalogSeederTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private const KEYS = ['system.name', 'system.contact_phone', 'system.contact_email', 'bank.name', 'bank.account_number', 'bank.account_holder', 'invoice.due_days', 'contract.expiring_warning_days'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Setting Test!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => 'Setting Test!42'])->assertOk();

        return $user;
    }

    public function test_database_seeder_creates_only_system_catalog_and_eight_safe_defaults(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('utility_prices', 0);
        $this->assertDatabaseCount('services', 2);
        $this->assertDatabaseCount('settings', 8);
        foreach (['ELECTRICITY' => 'kWh', 'WATER' => 'm3'] as $code => $unit) {
            $this->assertDatabaseHas('services', ['code' => $code, 'billing_type' => 'metered', 'unit' => $unit, 'price' => null, 'status' => 'active']);
        }
        $this->assertEqualsCanonicalizing(self::KEYS, Setting::pluck('key')->all());
        foreach (self::KEYS as $key) {
            $setting = Setting::where('key', $key)->sole();
            $expected = match ($key) {
                'invoice.due_days' => '5', 'contract.expiring_warning_days' => '30', default => null,
            };
            $this->assertSame($expected, $setting->value);
            $this->assertSame($expected === null ? 'string' : 'integer', $setting->type->value);
            $this->assertSame(explode('.', $key)[0], $setting->group);
        }
    }

    public function test_system_seeding_is_idempotent_and_preserves_configured_values_and_timestamps(): void
    {
        Setting::create(['key' => 'system.name', 'value' => 'Tên đã cấu hình', 'type' => 'string', 'group' => 'system']);
        Setting::create(['key' => 'invoice.due_days', 'value' => '12', 'type' => 'integer', 'group' => 'invoice']);
        Service::factory()->metered('ELECTRICITY', 'kWh')->create(['name' => 'Điện đã cấu hình', 'description' => 'Nội dung phải giữ']);
        $this->seed(SystemCatalogSeeder::class);
        $beforeServices = DB::table('services')->orderBy('id')->get()->toJson();
        $beforeSettings = DB::table('settings')->orderBy('id')->get()->toJson();
        $this->travel(5)->minutes();
        $this->seed(SystemCatalogSeeder::class);
        $this->assertSame($beforeServices, DB::table('services')->orderBy('id')->get()->toJson());
        $this->assertSame($beforeSettings, DB::table('settings')->orderBy('id')->get()->toJson());
        $this->assertSame('Tên đã cấu hình', Setting::where('key', 'system.name')->value('value'));
        $this->assertSame('12', Setting::where('key', 'invoice.due_days')->value('value'));
        $this->assertSame('Điện đã cấu hình', Service::where('code', 'ELECTRICITY')->value('name'));
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('utility_prices', 0);
    }

    /** @return array<string,array{array}> */
    public static function conflictingDefinitions(): array
    {
        return ['billing type' => [['billing_type' => 'per_room', 'price' => 100]], 'price' => [['price' => 5000]], 'unit' => [['unit' => 'lít']]];
    }

    #[DataProvider('conflictingDefinitions')]
    public function test_conflicting_reserved_definition_fails_without_rewriting_or_partial_seeding(array $changes): void
    {
        // WATER xử lý sau ELECTRICITY: lỗi phải hoàn tác cả dòng ELECTRICITY vừa tạo.
        $water = Service::factory()->metered('WATER', 'm3')->create($changes);
        $before = (array) DB::table('services')->find($water->id);
        $failure = null;
        try {
            $this->seed(SystemCatalogSeeder::class);
        } catch (RuntimeException $exception) {
            $failure = $exception;
        }
        $this->assertInstanceOf(RuntimeException::class, $failure);
        $this->assertStringContainsString('WATER', $failure->getMessage());
        $this->assertSame($before, (array) DB::table('services')->find($water->id));
        $this->assertDatabaseCount('services', 1);
        $this->assertDatabaseMissing('services', ['code' => 'ELECTRICITY']);
        $this->assertDatabaseCount('settings', 0);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('utility_prices', 0);
    }

    /** @return array<string,array{string}> */
    public static function blockedRoles(): array
    {
        return ['anonymous' => ['anonymous'], 'user' => ['user'], 'resident' => ['resident'], 'technician' => ['technician'], 'guard' => ['guard'], 'locked' => ['locked']];
    }

    #[DataProvider('blockedRoles')]
    public function test_settings_are_not_public_and_reject_non_admin_or_locked_accounts(string $role): void
    {
        if ($role !== 'anonymous') {
            $user = $this->signIn($role === 'locked' ? UserRole::Admin : UserRole::from($role));
            if ($role === 'locked') {
                $user->status = UserStatus::Locked;
                $user->save();
            }
        }
        $this->spa('GET', '/api/v1/settings')->assertStatus($role === 'anonymous' ? 401 : 403);
    }

    public function test_unseeded_settings_report_missing_keys_without_fabricated_values(): void
    {
        $this->signIn();
        $response = $this->spa('GET', '/api/v1/settings')->assertOk()->assertJsonCount(0, 'data');
        $this->assertEqualsCanonicalizing(self::KEYS, $response->json('missing_keys'));
        $this->assertDatabaseCount('settings', 0);
    }

    public function test_settings_allowlist_never_exposes_other_keys_or_internal_columns(): void
    {
        $this->signIn();
        $this->seed(SystemCatalogSeeder::class);
        Setting::create(['key' => 'private.external_token', 'value' => 'must-never-leak', 'type' => 'string', 'group' => 'private']);
        $response = $this->spa('GET', '/api/v1/settings')->assertOk()->assertJsonCount(8, 'data')->assertJsonPath('missing_keys', []);
        $this->assertEqualsCanonicalizing(self::KEYS, array_column($response->json('data'), 'key'));
        foreach ($response->json('data') as $row) {
            $this->assertEqualsCanonicalizing(['key', 'value', 'type', 'group'], array_keys($row));
        }
        $this->assertStringNotContainsString('must-never-leak', $response->getContent());
        $this->assertStringNotContainsString('private.external_token', $response->getContent());
        $this->spa('POST', '/api/v1/settings', ['key' => 'bank.account_number', 'value' => 'not approved'])->assertStatus(405);
        $this->assertNull(Setting::where('key', 'bank.account_number')->value('value'));
    }
}
