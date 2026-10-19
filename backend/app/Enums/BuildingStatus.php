<?php

namespace App\Enums;

/** Trạng thái tòa nhà — buildings.status. */
enum BuildingStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
}
