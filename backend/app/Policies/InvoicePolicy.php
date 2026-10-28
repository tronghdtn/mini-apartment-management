<?php

namespace App\Policies;

use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Models\Invoice;
use App\Models\User;

class InvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && in_array($user->role, [UserRole::Admin, UserRole::Resident], true);
    }

    public function view(User $user, Invoice $invoice): bool
    {
        return $this->viewAny($user) && ($user->hasRole(UserRole::Admin)
            || ($invoice->status !== InvoiceStatus::Draft && $invoice->contract?->user_id === $user->id));
    }

    public function create(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }

    public function update(User $user, Invoice $invoice): bool
    {
        return $this->create($user);
    }
}
