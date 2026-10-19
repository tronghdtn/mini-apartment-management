<?php

namespace App\Models;

use App\Enums\InvoiceItemType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Dòng hóa đơn — docs/09_DATABASE_DESIGN.md §3.15.
 * `amount` có dấu (discount âm), tính bằng App\Support\Money, HALF_UP từng dòng. `meta` lưu snapshot nguồn tính.
 * Chỉ tạo/xóa khi hóa đơn còn draft (kiểm tra ở InvoiceService).
 */
#[Fillable(['item_type', 'description', 'quantity', 'unit_price', 'amount', 'meta'])]
class InvoiceItem extends Model
{
    protected function casts(): array
    {
        return [
            'item_type' => InvoiceItemType::class,
            'quantity' => 'decimal:2',
            'unit_price' => 'integer',
            'amount' => 'integer',
            'meta' => 'array',
        ];
    }

    /** @return BelongsTo<Invoice, $this> */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
