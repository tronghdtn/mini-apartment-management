<?php

namespace Database\Factories;

use App\Enums\MeterReadingKind;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Chỉ dùng trong test. Không áp dụng quy tắc chuỗi chỉ số R1–R15 (đó là việc của MeterReadingService).
 *
 * @extends Factory<MeterReading>
 */
class MeterReadingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'room_id' => Room::factory(),
            'service_id' => Service::factory()->metered('ELECTRICITY_'.fake()->unique()->numerify('###'), 'kWh'),
            'kind' => MeterReadingKind::Periodic,
            'period' => '2026-10-01',
            'reading_date' => '2026-11-01',
            'previous_reading' => '100.00',
            'current_reading' => '112.35',
            'consumption' => '12.35',
            'unit_price' => 3500,
            'amount' => 43225,
        ];
    }

    public function final(): static
    {
        return $this->state(fn () => ['kind' => MeterReadingKind::Final]);
    }
}
