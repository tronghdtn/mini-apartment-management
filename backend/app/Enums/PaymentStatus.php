<?php

namespace App\Enums;

/** Trạng thái thanh toán — payments.status. Chỉ `confirmed` trừ công nợ; không chuyển ngược về `pending`. */
enum PaymentStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Rejected = 'rejected';
}
