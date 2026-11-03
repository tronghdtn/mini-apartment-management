<?php

namespace Tests\Feature\Catalog;

use App\Enums\UserRole;
use App\Models\Setting;
use App\Models\User;
use App\Services\SettingService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class SystemSettingsTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function login(UserRole $role = UserRole::Admin): User
    {
        $actor = User::factory()->role($role)->create(['password' => 'System setting test only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $actor->phone, 'password' => 'System setting test only!42'])->assertOk();

        return $actor;
    }

    public static function settings(): array
    {
        return [['system.name', 'Tên hệ thống mới'], ['system.contact_phone', '+84 (28) 1234 5678'], ['system.contact_email', 'contact@example.test']];
    }

    #[DataProvider('settings')]
    public function test_admin_can_create_update_and_clear_one_setting_without_touching_other_data(string $key, string $value): void
    {
        $actor = $this->login();
        $userBefore = $actor->fresh()->getRawOriginal();
        Setting::create(['key' => 'bank.name', 'value' => 'Unchanged bank', 'type' => 'string', 'group' => 'bank']);
        $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => '  '.$value.'  ', 'expected_value' => null])->assertOk()
            ->assertExactJson(['data' => ['key' => $key, 'value' => $value, 'type' => 'string', 'group' => 'system']]);
        $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => null, 'expected_value' => $value])->assertOk()->assertJsonPath('data.value', null);
        $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => '   ', 'expected_value' => null])->assertOk()->assertJsonPath('data.value', null);
        $this->spa('GET', '/api/v1/settings')->assertOk()->assertJsonFragment(['key' => $key, 'value' => null, 'type' => 'string', 'group' => 'system']);
        $this->assertDatabaseCount('settings', 2);
        $this->assertDatabaseHas('settings', ['key' => 'bank.name', 'value' => 'Unchanged bank']);
        $this->assertSame($userBefore, $actor->fresh()->getRawOriginal());
    }

    public function test_stale_value_cannot_overwrite_another_admin_and_reload_allows_a_deliberate_update(): void
    {
        $this->login();
        $body = ['value' => 'First Admin', 'expected_value' => null];
        $this->spa('PUT', '/api/v1/settings/system.name', $body)->assertOk();
        $this->login();
        $this->spa('PUT', '/api/v1/settings/system.name', ['value' => 'Second Admin', 'expected_value' => null])->assertStatus(409);
        $this->assertDatabaseHas('settings', ['key' => 'system.name', 'value' => 'First Admin']);
        $this->spa('PUT', '/api/v1/settings/system.name', ['value' => 'Second Admin', 'expected_value' => 'First Admin'])->assertOk();
        $this->assertDatabaseCount('settings', 1);
    }

    public static function legacyValues(): array
    {
        return [['  Legacy name  '], [''], [null]];
    }

    #[DataProvider('legacyValues')]
    public function test_expected_value_preserves_legacy_whitespace_and_empty_string(?string $old): void
    {
        $this->login();
        Setting::create(['key' => 'system.name', 'value' => $old, 'type' => 'string', 'group' => 'system']);
        $this->spa('PUT', '/api/v1/settings/system.name', ['value' => 'Updated', 'expected_value' => $old])->assertOk();
        $this->assertDatabaseHas('settings', ['key' => 'system.name', 'value' => 'Updated']);
    }

    public static function invalid(): array
    {
        return [
            ['system.name', ['expected_value' => null]], ['system.name', ['value' => 'Name']],
            ['system.name', ['value' => str_repeat('a', 192), 'expected_value' => null]],
            ['system.contact_phone', ['value' => str_repeat('1', 31), 'expected_value' => null]],
            ['system.contact_email', ['value' => 'invalid-email', 'expected_value' => null]],
            ['system.name', ['value' => true, 'expected_value' => null]],
            ['system.name', ['value' => [], 'expected_value' => null]],
            ['system.name', ['value' => 'Name', 'expected_value' => []]],
        ];
    }

    #[DataProvider('invalid')]
    public function test_invalid_values_are_rejected_without_creating_rows(string $key, array $input): void
    {
        $this->login();
        $this->spa('PUT', '/api/v1/settings/'.$key, $input)->assertUnprocessable();
        $this->assertDatabaseCount('settings', 0);
    }

    public function test_control_fields_and_bank_or_unknown_keys_cannot_be_written(): void
    {
        $this->login();
        foreach (['key', 'id', 'type', 'group', 'role.admin', 'user_id.*', '*'] as $field) {
            $this->spa('PUT', '/api/v1/settings/system.name', ['value' => 'Name', 'expected_value' => null, $field => 'forbidden'])->assertUnprocessable();
        }
        foreach (['bank.name', 'bank.account_number', 'bank.account_holder', 'system.unknown'] as $key) {
            $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => 'Name', 'expected_value' => null])->assertNotFound();
        }
        $this->assertDatabaseCount('settings', 0);
    }

    public function test_exact_limits_and_unicode_are_accepted(): void
    {
        $this->login();
        foreach (['system.name' => str_repeat('ế', 191), 'system.contact_phone' => str_repeat('1', 30)] as $key => $value) {
            $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => $value, 'expected_value' => null])->assertOk()->assertJsonPath('data.value', $value);
        }
    }

    public function test_wrong_metadata_is_not_silently_rewritten(): void
    {
        $this->login();
        Setting::create(['key' => 'system.name', 'value' => 'Old', 'type' => 'integer', 'group' => 'system']);
        $this->spa('PUT', '/api/v1/settings/system.name', ['value' => 'New', 'expected_value' => 'Old'])->assertStatus(409);
        $this->assertDatabaseHas('settings', ['key' => 'system.name', 'value' => 'Old', 'type' => 'integer']);
    }

    public function test_anonymous_non_admin_locked_and_missing_csrf_cannot_write(): void
    {
        $body = ['value' => 'Name', 'expected_value' => null];
        $url = '/api/v1/settings/system.name';
        $this->spa('PUT', $url, $body)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('PUT', $url, $body)->assertForbidden();
        }
        $admin = $this->login();
        $this->spa('PUT', $url, $body, sendCsrf: false)->assertStatus(419);
        $admin->status = 'locked';
        $admin->save();
        $this->spa('PUT', $url, $body)->assertForbidden();
        $this->assertDatabaseCount('settings', 0);
    }

    public function test_a_failed_transaction_leaves_the_old_value_intact(): void
    {
        $this->login();
        Setting::create(['key' => 'system.name', 'value' => 'Old', 'type' => 'string', 'group' => 'system']);
        DB::beginTransaction();
        app(SettingService::class)->updateSystem('system.name', 'New', 'Old');
        DB::rollBack();
        $this->assertDatabaseHas('settings', ['key' => 'system.name', 'value' => 'Old']);
    }
}
