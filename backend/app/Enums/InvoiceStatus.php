<?php

namespace App\Enums;

/**
 * Trạng thái hóa đơn — invoices.status. `overdue` là nhãn dẫn xuất từ due_date, không lưu.
 * Chuỗi 'cancelled' dùng trong biểu thức generated column live_*: không đổi giá trị nếu không có migration.
 */
enum InvoiceStatus: string
{
    case Draft = 'draft';
    case Issued = 'issued';
    case PartiallyPaid = 'partially_paid';
    case Paid = 'paid';
    case Cancelled = 'cancelled';
}
