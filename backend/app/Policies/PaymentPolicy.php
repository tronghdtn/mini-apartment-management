<?php

namespace App\Policies;

use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && in_array($user->role, [UserRole::Admin, UserRole::Resident], true);
    }

    public function view(User $user, Payment $payment): bool
    {
        return $this->viewAny($user) && ($user->hasRole(UserRole::Admin)
            || ($payment->invoice->status !== InvoiceStatus::Draft && $payment->invoice->contract->user_id === $user->id));
    }

    public function createForInvoice(User $user, Invoice $invoice): bool
    {
        return $this->viewAny($user) && ($user->hasRole(UserRole::Admin)
            || ($invoice->status !== InvoiceStatus::Draft && $invoice->contract->user_id === $user->id));
    }

    public function review(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }
}
