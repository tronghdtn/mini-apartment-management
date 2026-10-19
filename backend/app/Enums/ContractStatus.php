<?php

namespace App\Enums;

/**
 * Trạng thái hợp đồng — contracts.status.
 *
 * Chuỗi 'active' được dùng trong biểu thức generated column `active_room_id`/`active_tenant_id`:
 * không đổi giá trị này nếu không có migration đi kèm.
 */
enum ContractStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Terminated = 'terminated';

    /** Dành cho gia hạn hợp đồng (SHOULD) — khai báo sẵn, MVP chưa mở chuyển trạng thái này. */
    case Expired = 'expired';
}
