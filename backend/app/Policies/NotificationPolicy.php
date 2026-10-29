<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;

class NotificationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive();
    }

    public function view(User $user, Notification $notification): bool
    {
        return $user->isActive() && $notification->notifiable_type === 'user' && (int) $notification->notifiable_id === $user->id;
    }
}
