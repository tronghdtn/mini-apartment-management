<?php

namespace Database\Factories;

use App\Models\Amenity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Chỉ dùng trong test.
 *
 * @extends Factory<Amenity>
 */
class AmenityFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Tiện nghi '.fake()->unique()->numerify('####'),
            'description' => null,
        ];
    }
}
