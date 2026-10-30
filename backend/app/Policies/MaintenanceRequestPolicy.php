<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\MaintenanceRequest;
use App\Models\User;

class MaintenanceRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && ($user->hasRole(UserRole::Admin) || $user->hasRole(UserRole::Resident)
            || $user->hasRole(UserRole::Technician));
    }

    public function view(User $user, MaintenanceRequest $request): bool
    {
        if (! $user->isActive()) {
            return false;
        }

        return $user->hasRole(UserRole::Admin)
            || ($user->hasRole(UserRole::Resident) && (int) $request->user_id === (int) $user->id)
            || ($user->hasRole(UserRole::Technician) && (int) $request->assigned_to === (int) $user->id);
    }

    public function create(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Resident) && $user->hasActiveContract();
    }

    public function update(User $user, MaintenanceRequest $request): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function assign(User $user, MaintenanceRequest $request): bool
    {
        return $this->update($user, $request);
    }

    public function start(User $user, MaintenanceRequest $request): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Technician) && (int) $request->assigned_to === (int) $user->id;
    }

    public function resolve(User $user, MaintenanceRequest $request): bool
    {
        return $this->start($user, $request);
    }

    public function reject(User $user, MaintenanceRequest $request): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function reopen(User $user, MaintenanceRequest $request): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }
}
