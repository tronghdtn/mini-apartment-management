<?php

namespace App\Models;

use App\Enums\ContractStatus;
use App\Enums\DepositStatus;
use App\Enums\EarlyTerminationFeeType;
use App\Enums\InspectionResult;
use Database\Factories\ContractFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Hợp đồng — docs/09_DATABASE_DESIGN.md §3.8.
 *
 * Chỉ các trường của bản nháp được mass-assign. Trạng thái, mã, ngày kích hoạt/bàn giao, đối soát cọc,
 * gia hạn do Service vòng đời hợp đồng gán tường minh trong transaction. Generated column
 * `active_room_id`, `active_tenant_id` không bao giờ được ghi.
 *
 * `end_date` là ngày cuối được ở, tính cả ngày đó (DB-D43); bàn giao đúng hạn vào end_date + 1.
 * `actual_end_date` là ngày bàn giao thực tế, mốc LOẠI TRỪ (DB-D32): ngày tính tiền =
 * [start_date, actual_end_date). Quá `end_date` mà vẫn active thì tiếp tục tính tiền.
 * `actual_end_date = start_date` (thanh lý ngay ngày đầu, DB-D41) cho 0 ngày tính tiền.
 *
 * `meter_gap_reason`, `meter_gap_confirmed_by` (DB-D40) chỉ ghi trong transaction kích hoạt khi chỉ số đầu
 * cao hơn mốc chốt gần nhất; không mass-assign để form cập nhật hợp đồng thông thường không sửa được.
 */
#[Fillable([
    'room_id', 'user_id', 'start_date', 'end_date', 'monthly_rent', 'occupant_count',
    'initial_electricity_reading', 'initial_water_reading', 'deposit_amount', 'note',
])]
class Contract extends Model
{
    /** @use HasFactory<ContractFactory> */
    use HasFactory, SoftDeletes;

    protected $attributes = [
        'status' => 'draft',
        'deposit_status' => 'unpaid',
        'deposit_amount' => 0,
        'deposit_deducted_amount' => 0,
        'deposit_refund_amount' => 0,
    ];

    protected function casts(): array
    {
        return [
            'status' => ContractStatus::class,
            'deposit_status' => DepositStatus::class,
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'actual_end_date' => 'date:Y-m-d',
            'activated_at' => 'datetime',
            'closed_at' => 'datetime',
            'deposit_paid_at' => 'datetime',
            'deposit_settled_at' => 'datetime',
            'deposit_refunded_at' => 'datetime',
            'deposit_refunded_by' => 'integer',
            'monthly_rent' => 'integer',
            'early_termination_fee_type' => EarlyTerminationFeeType::class,
            'early_termination_fee_amount' => 'integer',
            'early_termination_fee_multiplier' => 'decimal:2',
            'early_termination_waiver_conditions' => 'array',
            'early_termination_waived_at' => 'datetime',
            'inspection_result' => InspectionResult::class,
            'inspected_at' => 'datetime',
            'occupant_count' => 'integer',
            'initial_electricity_reading' => 'decimal:2',
            'initial_water_reading' => 'decimal:2',
            'deposit_amount' => 'integer',
            'deposit_deducted_amount' => 'integer',
            'deposit_refund_amount' => 'integer',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === ContractStatus::Active;
    }

    /** Includes fields, service snapshots and occupants; timestamps alone can miss two writes in one second. */
    public function lifecycleRevision(): string
    {
        $attributes = $this->getRawOriginal();
        ksort($attributes);
        // Sort like occupants: a lazy-loaded relation has no ORDER BY, so MySQL index order must not change the hash.
        $lines = $this->contractServices->sortBy('id')->values()->map(function ($line) {
            $values = $line->getRawOriginal();
            ksort($values);

            return $values;
        })->all();

        $occupants = $this->occupants->sortBy('id')->values()->map(function ($row) {
            $values = $row->getRawOriginal();
            ksort($values);

            return $values;
        })->all();

        return hash('sha256', json_encode([$attributes, $lines, $occupants], JSON_THROW_ON_ERROR));
    }

    /** @param Builder<Contract> $query */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('status', ContractStatus::Active);
    }

    /** @return BelongsTo<Room, $this> */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /** Người thuê đại diện. @return BelongsTo<User, $this> */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return HasMany<ContractOccupant, $this> */
    public function occupants(): HasMany
    {
        return $this->hasMany(ContractOccupant::class);
    }

    /** @return HasMany<ContractService, $this> */
    public function contractServices(): HasMany
    {
        return $this->hasMany(ContractService::class);
    }

    /** Hợp đồng gốc khi đây là hợp đồng gia hạn (SHOULD). @return BelongsTo<Contract, $this> */
    public function renewedFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'renewed_from_id');
    }

    /** Hợp đồng gia hạn từ hợp đồng này (tối đa 1, UNIQUE renewed_from_id). @return HasOne<Contract, $this> */
    public function renewal(): HasOne
    {
        return $this->hasOne(self::class, 'renewed_from_id');
    }

    /** Admin xác nhận chênh lệch chỉ số đầu (DB-D40). @return BelongsTo<User, $this> */
    public function meterGapConfirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'meter_gap_confirmed_by');
    }

    /** @return BelongsTo<User, $this> */
    public function earlyTerminationWaiverConfirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'early_termination_waived_by');
    }

    /** @return HasMany<Invoice, $this> */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /** @return MorphMany<Attachment, $this> */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    /** Chỉ số mà hợp đồng chịu phí (contract_id do backend xác định — DB-D15). @return HasMany<MeterReading, $this> */
    public function meterReadings(): HasMany
    {
        return $this->hasMany(MeterReading::class);
    }
}
