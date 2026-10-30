<?php

namespace App\Enums;

enum MaintenanceRequestStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';
    case Rejected = 'rejected';
}
