<?php

namespace App\Enums;

enum ContractClosureReason: string
{
    case SameDay = 'same_day';
    case EarlyTermination = 'early_termination';
    case OnTime = 'on_time';
    case OverdueReturn = 'overdue_return';
}
