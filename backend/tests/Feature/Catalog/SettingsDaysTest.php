<?php

namespace Tests\Feature\Catalog;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class SettingsDaysTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Settings Test Password!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => 'Settings Test Password!42'])->assertOk();

        return $user;
    }

    public static function validValues(): array
    {
        $cases = [];
        foreach (['invoice.due_days', 'contract.expiring_warning_days'] as $key) {
            foreach ([1, 30, 365] as $value) {
                $cases[$key.' '.$value] = [$key, $value];
            }
        }

        return $cases;
    }

    #[DataProvider('validValues')]
    public function test_admin_can_create_then_update_a_known_days_setting(string $key, int $value): void
    {
        $this->signIn();
        $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => $value])->assertOk()
            ->assertExactJson(['data' => ['key' => $key, 'value' => (string) $value, 'type' => 'integer', 'group' => explode('.', $key)[0]]]);
        $id = Setting::where('key', $key)->value('id');
        $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => 5])->assertOk()->assertJsonPath('data.value', '5');
        $this->assertDatabaseCount('settings', 1);
        $this->assertDatabaseHas('settings', ['id' => $id, 'key' => $key, 'value' => '5']);
        $this->spa('GET', '/api/v1/settings')->assertOk()->assertJsonPath('data.0.value', '5');
    }

    public static function invalidValues(): array
    {
        return ['zero' => [0], 'negative' => [-1], 'too high' => [366], 'fraction' => [1.5], 'true' => [true], 'false' => [false], 'null' => [null], 'text' => ['five'], 'array' => [[5]]];
    }

    #[DataProvider('invalidValues')]
    public function test_invalid_days_do_not_create_or_change_configuration(mixed $value): void
    {
        $this->signIn();
        $this->spa('PUT', '/api/v1/settings/invoice.due_days', ['value' => $value])->assertUnprocessable()->assertJsonValidationErrors('value');
        $this->assertDatabaseCount('settings', 0);
        Setting::create(['key' => 'invoice.due_days', 'value' => '5', 'type' => 'integer', 'group' => 'invoice']);
        $this->spa('PUT', '/api/v1/settings/invoice.due_days', ['value' => $value])->assertUnprocessable()->assertJsonValidationErrors('value');
        $this->assertDatabaseHas('settings', ['key' => 'invoice.due_days', 'value' => '5']);
    }

    public function test_server_controls_setting_key_type_and_group(): void
    {
        $this->signIn();
        foreach (['key', 'type', 'group', 'id'] as $field) {
            $this->spa('PUT', '/api/v1/settings/invoice.due_days', ['value' => 5, $field => null])->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        foreach (['bank.name', 'system.name', 'invoice.unknown'] as $key) {
            $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => 5])->assertNotFound();
        }
        $this->spa('PUT', '/api/v1/settings/invoice.due_days', [])->assertUnprocessable()->assertJsonValidationErrors('value');
        $this->assertDatabaseCount('settings', 0);
    }

    public function test_authentication_role_active_state_and_csrf_are_required_to_write(): void
    {
        $this->spa('PUT', '/api/v1/settings/invoice.due_days', ['value' => 5])->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->signIn($role);
            $this->spa('PUT', '/api/v1/settings/invoice.due_days', ['value' => 5])->assertForbidden();
        }
        $admin = $this->signIn();
        $this->spa('PUT', '/api/v1/settings/invoice.due_days', ['value' => 5], sendCsrf: false)->assertStatus(419);
        $admin->status = UserStatus::Locked;
        $admin->save();
        $this->spa('PUT', '/api/v1/settings/invoice.due_days', ['value' => 5])->assertForbidden();
        $this->assertDatabaseCount('settings', 0);
    }
}
