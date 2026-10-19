<?php

namespace App\Enums;

/** Loại chỉ số — meter_readings.kind. `final` chỉ tạo từ luồng thanh lý (DB-D25, DB-D28). */
enum MeterReadingKind: string
{
    case Periodic = 'periodic';
    case Final = 'final';
}
