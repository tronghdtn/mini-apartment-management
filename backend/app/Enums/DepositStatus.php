<?php

namespace App\Enums;

/** Trạng thái tiền cọc — contracts.deposit_status. Cọc không phải doanh thu. */
enum DepositStatus: string
{
    case Unpaid = 'unpaid';
    case Held = 'held';
    case Settled = 'settled';

    /** Chuyển cọc sang hợp đồng gia hạn (SHOULD) — khai báo sẵn, MVP chưa mở chuyển trạng thái này. */
    case Transferred = 'transferred';
}
