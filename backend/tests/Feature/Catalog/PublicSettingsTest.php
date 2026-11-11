<?php

namespace Tests\Feature\Catalog;

use App\Enums\UserRole;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

/** Thông tin liên hệ công khai: khách chưa đăng nhập đọc được, không bao giờ lộ thông tin ngân hàng. */
class PublicSettingsTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    private function seedSettings(array $values): void
    {
        foreach ($values as $key => $value) {
            Setting::create(['key' => $key, 'value' => $value, 'type' => 'string', 'group' => strtok($key, '.')]);
        }
    }

    public function test_guest_reads_only_name_phone_and_email_and_never_bank_details(): void
    {
        $this->seedSettings([
            'system.name' => 'MiniApart Test', 'system.contact_phone' => ' 0900 000 111 ', 'system.contact_email' => 'lienhe@example.test',
            'bank.name' => 'Ngân hàng thử', 'bank.account_number' => '000111222333', 'bank.account_holder' => 'CHU TAI KHOAN THU',
        ]);

        $response = $this->getJson('/api/v1/public/settings')->assertOk()
            ->assertExactJson(['data' => ['system_name' => 'MiniApart Test', 'contact_phone' => '0900 000 111', 'contact_email' => 'lienhe@example.test']]);

        $body = $response->getContent();
        foreach (['000111222333', 'CHU TAI KHOAN THU', 'Ngân hàng thử', 'bank', 'invoice.due_days'] as $secret) {
            $this->assertStringNotContainsString($secret, $body);
        }
    }

    public function test_missing_or_blank_values_are_null_instead_of_placeholder_contacts(): void
    {
        $this->seedSettings(['system.name' => '   ', 'system.contact_email' => '']);

        $this->getJson('/api/v1/public/settings')->assertOk()
            ->assertExactJson(['data' => ['system_name' => null, 'contact_phone' => null, 'contact_email' => null]]);
    }

    public static function roles(): array
    {
        return array_map(fn (UserRole $role) => [$role], UserRole::cases());
    }

    #[DataProvider('roles')]
    public function test_every_signed_in_role_gets_the_same_public_contact(UserRole $role): void
    {
        $this->seedSettings(['system.contact_phone' => '0900 000 222']);
        $this->initializeSpaClient();
        $actor = User::factory()->role($role)->create(['password' => 'Public settings test only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $actor->phone, 'password' => 'Public settings test only!42'])->assertOk();

        $this->spa('GET', '/api/v1/public/settings')->assertOk()->assertJsonPath('data.contact_phone', '0900 000 222');
    }

    public function test_endpoint_is_read_only(): void
    {
        foreach (['postJson', 'putJson', 'deleteJson'] as $method) {
            $this->{$method}('/api/v1/public/settings', ['contact_phone' => '0999'])->assertStatus(405);
        }
        $this->assertDatabaseMissing('settings', ['value' => '0999']);
    }
}
