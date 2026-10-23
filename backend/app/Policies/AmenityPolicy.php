<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Amenity;
use App\Models\User;

class AmenityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function view(User $user, Amenity $amenity): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Amenity $amenity): bool
    {
        return $this->viewAny($user);
    }

    public function delete(User $user, Amenity $amenity): bool
    {
        return $this->viewAny($user);
    }
}
