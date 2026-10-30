<?php

namespace App\Enums;

enum InspectionResult: string
{
    case NoDamage = 'no_damage';
    case Damaged = 'damaged';
}
