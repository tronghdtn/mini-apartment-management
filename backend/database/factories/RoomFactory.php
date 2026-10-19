<?php

namespace Database\Factories;

use App\Models\Building;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Chỉ dùng trong test.
 *
 * @extends Factory<Room>
 */
class RoomFactory extends Factory
{
    public function definition(): array
    {
        return [
            'building_id' => Building::factory(),
            'code' => fake()->unique()->numerify('P###'),
            'floor_number' => 1,
            'area' => '25.50',
            'base_price' => 3500000,
            'deposit_amount' => 3500000,
            'max_occupants' => 3,
            'is_public' => false,
            'description' => null,
        ];
    }
}
