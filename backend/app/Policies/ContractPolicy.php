<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\User;

class ContractPolicy
{
    public function viewOwnContracts(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Resident);
    }

    public function viewOwnContract(User $user, Contract $contract): bool
    {
        return $this->viewOwnContracts($user) && (int) $contract->user_id === $user->id && $contract->status->value !== 'draft';
    }

    public function viewAny(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function view(User $user, Contract $contract): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Contract $contract): bool
    {
        // Service trả 409 khi hợp đồng không còn là nháp, sau khi khóa lại bản ghi.
        return $this->viewAny($user);
    }

    public function delete(User $user, Contract $contract): bool
    {
        return $this->viewAny($user);
    }
}
