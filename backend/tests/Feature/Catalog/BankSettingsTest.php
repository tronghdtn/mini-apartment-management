<?php

namespace Tests\Feature\Catalog;

use App\Enums\UserRole;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class BankSettingsTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    private const PASSWORD = 'Bank setting test only!42';

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
    }

    private function login(UserRole $role = UserRole::Admin): User
    {
        $actor = User::factory()->role($role)->create(['password' => self::PASSWORD]);
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $actor->email, 'password' => self::PASSWORD])->assertOk();

        return $actor;
    }

    public static function settings(): array
    {
        return [['bank.name', 'Ngân hàng TMCP Ngoại thương Việt Nam'], ['bank.account_number', '0071000123456'], ['bank.account_holder', 'CÔNG TY QUẢN LÝ MINI']];
    }

    #[DataProvider('settings')]
    public function test_admin_creates_updates_and_clears_one_bank_key_with_compare_and_set(string $key, string $value): void
    {
        $this->login();
        Setting::create(['key' => 'system.name', 'value' => 'Giữ nguyên', 'type' => 'string', 'group' => 'system']);
        $invoices = DB::table('invoices')->count();
        $url = '/api/v1/settings/'.$key;
        $this->spa('PUT', $url, ['value' => '  '.$value.'  ', 'expected_value' => null])->assertOk()
            ->assertJsonPath('data.key', $key)->assertJsonPath('data.value', $value)->assertJsonPath('data.group', 'bank');
        $this->spa('PUT', $url, ['value' => $value, 'expected_value' => null])->assertStatus(409);
        $this->spa('PUT', $url, ['value' => '', 'expected_value' => $value])->assertOk()->assertJsonPath('data.value', null);
        $this->assertDatabaseHas('settings', ['key' => $key, 'value' => null, 'type' => 'string', 'group' => 'bank']);
        $this->assertDatabaseHas('settings', ['key' => 'system.name', 'value' => 'Giữ nguyên']);
        $this->assertSame($invoices, DB::table('invoices')->count());
    }

    public function test_validation_limits_account_number_digits_and_control_fields(): void
    {
        $this->login();
        foreach (['12345', '123456789012345678901', '0071 000 123', '0071-000123', 'ABC123456', '１２３４５６'] as $invalid) {
            $this->spa('PUT', '/api/v1/settings/bank.account_number', ['value' => $invalid, 'expected_value' => null])
                ->assertUnprocessable()->assertJsonValidationErrors('value');
        }
        foreach (['123456', '12345678901234567890'] as $valid) {
            Setting::where('key', 'bank.account_number')->delete();
            $this->spa('PUT', '/api/v1/settings/bank.account_number', ['value' => $valid, 'expected_value' => null])->assertOk();
        }
        foreach (['bank.name', 'bank.account_holder'] as $key) {
            $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => str_repeat('ế', 101), 'expected_value' => null])->assertUnprocessable();
            $this->spa('PUT', '/api/v1/settings/'.$key, ['value' => str_repeat('ế', 100), 'expected_value' => null])->assertOk();
        }
        foreach (['key', 'type', 'group', 'id'] as $field) {
            $this->spa('PUT', '/api/v1/settings/bank.name', ['value' => 'X', 'expected_value' => str_repeat('ế', 100), $field => 'x'])->assertUnprocessable();
        }
        $this->spa('PUT', '/api/v1/settings/bank.name', ['value' => 'X'])->assertUnprocessable()->assertJsonValidationErrors('expected_value');
        $this->spa('PUT', '/api/v1/settings/bank.name', ['value' => 123, 'expected_value' => null])->assertUnprocessable();
    }

    public function test_wrong_group_is_not_rewritten_and_only_active_admin_with_csrf_can_write(): void
    {
        Setting::create(['key' => 'bank.name', 'value' => 'Cũ', 'type' => 'string', 'group' => 'system']);
        $body = ['value' => 'Mới', 'expected_value' => 'Cũ'];
        $this->spa('PUT', '/api/v1/settings/bank.name', $body)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('PUT', '/api/v1/settings/bank.name', $body)->assertForbidden();
        }
        $admin = $this->login();
        $this->spa('PUT', '/api/v1/settings/bank.name', $body, sendCsrf: false)->assertStatus(419);
        $this->spa('PUT', '/api/v1/settings/bank.name', $body)->assertStatus(409);
        $admin->forceFill(['status' => 'locked'])->save();
        $this->spa('PUT', '/api/v1/settings/bank.name', $body)->assertForbidden();
        $this->assertDatabaseHas('settings', ['key' => 'bank.name', 'value' => 'Cũ', 'group' => 'system']);
    }
}
