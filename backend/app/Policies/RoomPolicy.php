<?php

namespace App\Policies;

use App\Enums\RoomStatus;
use App\Enums\UserRole;
use App\Models\Room;
use App\Models\User;

class RoomPolicy
{
    public function viewPublicAny(?User $user): bool
    {
        return true;
    }

    public function viewPublic(?User $user, Room $room): bool
    {
        return $room->is_public && $room->status === RoomStatus::Available;
    }

    public function viewAny(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function view(User $user, Room $room): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Room $room): bool
    {
        return $this->viewAny($user);
    }
}
