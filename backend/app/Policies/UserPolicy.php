<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function view(User $user, User $target): bool
    {
        return $this->viewAny($user);
    }

    public function createStaff(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function changeStatus(User $user, User $target): bool
    {
        return $this->viewAny($user)
            && $user->id !== $target->id
            && in_array($target->role, [UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard], true);
    }

    public function updateName(User $user, User $target): bool
    {
        return $this->viewAny($user);
    }
}
