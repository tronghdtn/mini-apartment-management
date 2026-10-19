<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Thanh toán — docs/09_DATABASE_DESIGN.md §3.16. Một hóa đơn có nhiều payment; chỉ `confirmed` trừ công nợ.
 *
 * Chỉ `amount`, `method` được mass-assign. `status` (không có default ở DB), `receipt_number`, `submitted_by`,
 * `reviewed_by`, `reviewed_at`, `reject_reason` do PaymentService gán từ người dùng đăng nhập và quy trình duyệt.
 * Ảnh minh chứng (attachments, collection payment_proof) bổ sung ở Nhóm 4.
 */
#[Fillable(['amount', 'method'])]
class Payment extends Model
{
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Invoice, $this> */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /** Người thao tác nộp (không khẳng định chủ tài khoản ngân hàng). @return BelongsTo<User, $this> */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
