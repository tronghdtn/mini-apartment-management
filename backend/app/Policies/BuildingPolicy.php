<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Building;
use App\Models\User;

class BuildingPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function view(User $user, Building $building): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Building $building): bool
    {
        return $this->viewAny($user);
    }
}
