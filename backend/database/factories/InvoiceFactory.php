<?php

namespace Database\Factories;

use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Models\Contract;
use App\Models\Invoice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Chỉ dùng trong test. State chỉ đặt dữ liệu, không thay InvoiceService (không tính tiền, không sinh mã).
 *
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'contract_id' => Contract::factory()->active(),
            'type' => InvoiceType::Monthly,
            'period' => '2026-11-01',
        ];
    }

    public function final(): static
    {
        return $this->state(fn () => ['type' => InvoiceType::Final]);
    }

    public function issued(): static
    {
        return $this->state(fn () => ['status' => InvoiceStatus::Issued, 'issued_at' => now(), 'due_date' => '2026-11-06']);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => ['status' => InvoiceStatus::Cancelled, 'cancel_reason' => 'Lập lại do sai chỉ số']);
    }
}
