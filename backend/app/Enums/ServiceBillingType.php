<?php

namespace App\Enums;

/** Cách tính phí dịch vụ — services.billing_type. metered: điện/nước theo chỉ số (DB-D04). */
enum ServiceBillingType: string
{
    case PerRoom = 'per_room';
    case PerPerson = 'per_person';
    case PerUnit = 'per_unit';
    case Metered = 'metered';
}
