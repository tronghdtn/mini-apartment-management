<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_valid_user_with_enum_casts(): void
    {
        $user = User::factory()->create()->fresh();

        $this->assertSame(UserRole::User, $user->role);
        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertTrue($user->isActive());
        $this->assertNotEmpty($user->phone);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_factory_states_for_five_actors(): void
    {
        foreach (UserRole::cases() as $role) {
            $this->assertTrue(User::factory()->role($role)->create()->fresh()->hasRole($role));
        }

        $this->assertSame(UserStatus::Locked, User::factory()->locked()->create()->fresh()->status);
    }

    public function test_new_model_has_column_defaults_before_save(): void
    {
        $user = new User;

        $this->assertSame(UserRole::User, $user->role);
        $this->assertSame(UserStatus::Active, $user->status);
    }

    public function test_role_and_status_are_not_mass_assignable(): void
    {
        $user = User::create([
            'full_name' => 'Trần Thị B',
            'email' => 'b@example.com',
            'phone' => '0911111111',
            'password' => 'secret-password',
            'role' => 'admin',
            'status' => 'locked',
        ])->fresh();

        $this->assertSame(UserRole::User, $user->role);
        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertTrue(Hash::check('secret-password', $user->password));
    }

    public function test_serialization_hides_secrets_and_id_number(): void
    {
        $user = User::factory()->create([
            'id_number' => '001200000123',
            'date_of_birth' => '2000-02-29',
        ])->fresh();

        $data = $user->toArray();

        $this->assertArrayNotHasKey('password', $data);
        $this->assertArrayNotHasKey('remember_token', $data);
        $this->assertArrayNotHasKey('id_number', $data); // DB-D19
        $this->assertSame('001200000123', $user->id_number, 'Vẫn đọc được qua thuộc tính cho Resource Admin');
        $this->assertSame('2000-02-29', $data['date_of_birth']);
        $this->assertSame('user', $data['role']);
    }
}
