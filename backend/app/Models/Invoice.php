<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use Database\Factories\InvoiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Hóa đơn — docs/09_DATABASE_DESIGN.md §3.14.
 *
 * Chỉ khung bản nháp được mass-assign. Trạng thái, mã, ngày phát hành/hạn, tổng tiền, liên kết hóa đơn thay thế,
 * lý do hủy do InvoiceService gán tường minh trong transaction. Hóa đơn đã phát hành bất biến (DB-D27).
 * Generated column live_* không bao giờ được ghi.
 */
#[Fillable(['contract_id', 'type', 'period'])]
class Invoice extends Model
{
    /** @use HasFactory<InvoiceFactory> */
    use HasFactory;

    protected $attributes = [
        'status' => 'draft',
        'total_amount' => 0,
        'paid_amount' => 0,
    ];

    protected function casts(): array
    {
        return [
            'type' => InvoiceType::class,
            'status' => InvoiceStatus::class,
            'period' => 'date:Y-m-d',
            'due_date' => 'date:Y-m-d',
            'issued_at' => 'datetime',
            'total_amount' => 'integer',
            'paid_amount' => 'integer',
        ];
    }

    public function isDraft(): bool
    {
        return $this->status === InvoiceStatus::Draft;
    }

    public function revision(): string
    {
        return hash('sha256', json_encode([$this->getRawOriginal(),
            $this->items->sortBy('id')->map(fn ($item) => $item->getRawOriginal())->values()->all()], JSON_THROW_ON_ERROR));
    }

    /** @return BelongsTo<Contract, $this> */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    /** @return HasMany<InvoiceItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** Chỉ số điện nước đã đưa vào hóa đơn này. @return HasMany<MeterReading, $this> */
    public function meterReadings(): HasMany
    {
        return $this->hasMany(MeterReading::class);
    }

    /** Hóa đơn đã hủy mà hóa đơn này thay thế (DB-D27). @return BelongsTo<Invoice, $this> */
    public function relatedInvoice(): BelongsTo
    {
        return $this->belongsTo(self::class, 'related_invoice_id');
    }

    /** Các hóa đơn lập lại thay cho hóa đơn này. @return HasMany<Invoice, $this> */
    public function replacements(): HasMany
    {
        return $this->hasMany(self::class, 'related_invoice_id');
    }
}
