<?php

namespace Database\Factories;

use App\Models\Building;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Chỉ dùng trong test — không seed vào database dùng chung (AGENTS.md §3).
 *
 * @extends Factory<Building>
 */
class BuildingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Tòa '.fake()->unique()->bothify('??-###'),
            'address' => fake()->streetAddress(),
            'total_floors' => fake()->numberBetween(3, 9),
            'description' => null,
        ];
    }
}
