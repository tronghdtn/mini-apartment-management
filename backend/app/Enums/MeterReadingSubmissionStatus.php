<?php

namespace App\Enums;

enum MeterReadingSubmissionStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
