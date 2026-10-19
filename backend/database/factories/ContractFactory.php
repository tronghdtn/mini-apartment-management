<?php

namespace Database\Factories;

use App\Enums\ContractStatus;
use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Chỉ dùng trong test. Các state chỉ đặt dữ liệu, không thay cho Service vòng đời hợp đồng
 * (không đổi trạng thái phòng/vai trò người thuê).
 *
 * @extends Factory<Contract>
 */
class ContractFactory extends Factory
{
    public function definition(): array
    {
        return [
            'room_id' => Room::factory(),
            'user_id' => User::factory(),
            'start_date' => '2026-10-01',
            'end_date' => '2027-10-01',
            'monthly_rent' => 3500000,
            'occupant_count' => 1,
            'deposit_amount' => 3500000,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'status' => ContractStatus::Active,
            'activated_at' => now(),
            'initial_electricity_reading' => '100.00',
            'initial_water_reading' => '10.00',
        ]);
    }

    public function terminated(): static
    {
        return $this->active()->state(fn () => [
            'status' => ContractStatus::Terminated,
            'actual_end_date' => '2026-12-01',
            'closed_at' => now(),
        ]);
    }
}
