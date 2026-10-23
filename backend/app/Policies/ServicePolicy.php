<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Service;
use App\Models\User;

class ServicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function view(User $user, Service $service): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Service $service): bool
    {
        return $this->viewAny($user);
    }
}
