<?php

namespace App\Enums;

/** Trạng thái phòng — rooms.status. `is_public` không thay thế trạng thái này. */
enum RoomStatus: string
{
    case Available = 'available';
    case Occupied = 'occupied';
    case Maintenance = 'maintenance';
    case Inactive = 'inactive';
}
