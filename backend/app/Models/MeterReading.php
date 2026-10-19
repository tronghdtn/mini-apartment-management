<?php

namespace App\Models;

use App\Enums\MeterReadingKind;
use Database\Factories\MeterReadingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Chỉ số điện/nước — docs/09_DATABASE_DESIGN.md §3.13.
 *
 * Chỉ dữ liệu Admin nhập được mass-assign (phòng, dịch vụ, kỳ tiêu thụ, ngày đo, chỉ số hiện tại).
 * `kind`, `contract_id`, `previous_reading`, `consumption`, `unit_price`, `amount`, `invoice_id` do backend xác định
 * theo chuỗi chỉ số và quy tắc R1–R15 (DATABASE_IMPLEMENTATION_PLAN.md §5) — không nhận từ client.
 */
#[Fillable(['room_id', 'service_id', 'period', 'reading_date', 'current_reading'])]
class MeterReading extends Model
{
    /** @use HasFactory<MeterReadingFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'kind' => MeterReadingKind::class,
            'period' => 'date:Y-m-d',
            'reading_date' => 'date:Y-m-d',
            'previous_reading' => 'decimal:2',
            'current_reading' => 'decimal:2',
            'consumption' => 'decimal:2',
            'unit_price' => 'integer',
            'amount' => 'integer',
        ];
    }

    /** @return BelongsTo<Room, $this> */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /** Hợp đồng chịu phí; NULL khi khoảng tiêu thụ là phòng trống. @return BelongsTo<Contract, $this> */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /** @return BelongsTo<Invoice, $this> */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
