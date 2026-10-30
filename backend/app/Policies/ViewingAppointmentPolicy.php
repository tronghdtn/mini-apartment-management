<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\ViewingAppointment;

class ViewingAppointmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive();
    }

    public function view(User $user, ViewingAppointment $appointment): bool
    {
        return $user->isActive() && ($user->role === UserRole::Admin
            || ($user->role === UserRole::Guard && $appointment->status->value === 'confirmed'
                && $appointment->preferred_at->setTimezone(config('app.business_timezone'))->isToday())
            || ($user->role !== UserRole::Guard && (int) $appointment->user_id === $user->id));
    }

    public function manage(User $user): bool
    {
        return $user->isActive() && $user->role === UserRole::Admin;
    }

    public function cancel(User $user, ViewingAppointment $appointment): bool
    {
        return $user->isActive() && ($user->role === UserRole::Admin || (int) $appointment->user_id === $user->id);
    }

    public function check(User $user, ViewingAppointment $appointment): bool
    {
        return $user->isActive() && $user->role === UserRole::Guard && $this->view($user, $appointment);
    }
}
