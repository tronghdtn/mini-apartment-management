<?php

namespace Database\Factories;

use App\Enums\ServiceBillingType;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Chỉ dùng trong test — dịch vụ hệ thống ELECTRICITY/WATER sẽ do seeder hệ thống tạo (Nhóm 5).
 *
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    public function definition(): array
    {
        $code = fake()->unique()->bothify('SVC_####');

        return [
            'code' => $code,
            'name' => 'Dịch vụ '.$code,
            'billing_type' => ServiceBillingType::PerRoom,
            'unit' => null,
            'price' => 100000,
        ];
    }

    public function metered(string $code, string $unit): static
    {
        return $this->state(fn () => [
            'code' => $code,
            'name' => $code,
            'billing_type' => ServiceBillingType::Metered,
            'unit' => $unit,
            'price' => null,
        ]);
    }
}
