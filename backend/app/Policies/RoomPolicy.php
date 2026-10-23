<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Room;
use App\Models\User;

class RoomPolicy
{
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
