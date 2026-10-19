<?php

namespace App\Enums;

/** Trạng thái tài khoản — users.status. Khóa thay vì xóa tài khoản từng có hợp đồng. */
enum UserStatus: string
{
    case Active = 'active';
    case Locked = 'locked';
}
