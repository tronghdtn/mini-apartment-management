<?php

namespace App\Enums;

/**
 * Loại hóa đơn — invoices.type.
 * Chuỗi 'monthly', 'final' dùng trong biểu thức generated column live_* (DB-D14): không đổi giá trị nếu không có migration.
 */
enum InvoiceType: string
{
    case Monthly = 'monthly';
    case Final = 'final';

    /** Điều chỉnh sau khi đã thanh toán (SHOULD) — khai báo sẵn, MVP chưa mở luồng này. */
    case Adjustment = 'adjustment';
}
