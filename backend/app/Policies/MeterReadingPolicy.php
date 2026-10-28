<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

class MeterReadingPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }
}
