<?php

namespace App\Enums;

/** Vai trò tài khoản — users.role (DB-D02). Khách vãng lai không có tài khoản. */
enum UserRole: string
{
    case User = 'user';
    case Resident = 'resident';
    case Admin = 'admin';
    case Technician = 'technician';
    case Guard = 'guard';
}
