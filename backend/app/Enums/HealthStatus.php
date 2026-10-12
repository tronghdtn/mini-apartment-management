<?php

namespace App\Enums;

enum HealthStatus: string
{
    case Ok = 'ok';
    case Degraded = 'degraded';
}
