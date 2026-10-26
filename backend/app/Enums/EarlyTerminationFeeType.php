<?php

namespace App\Enums;

enum EarlyTerminationFeeType: string
{
    case None = 'none';
    case Fixed = 'fixed';
    case RentMultiple = 'rent_multiple';
}
