<?php

namespace App\Enums;

/** Trạng thái dịch vụ — services.status. */
enum ServiceStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
}
