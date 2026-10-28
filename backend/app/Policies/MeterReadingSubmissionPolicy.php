<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\MeterReadingSubmission;
use App\Models\User;

class MeterReadingSubmissionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isActive() && ($user->hasRole(UserRole::Admin) || $user->hasRole(UserRole::Resident));
    }

    public function view(User $user, MeterReadingSubmission $submission): bool
    {
        return $user->isActive() && ($user->hasRole(UserRole::Admin)
            || ($user->hasRole(UserRole::Resident) && (int) $submission->submitted_by === (int) $user->id
                && (int) $submission->contract?->user_id === (int) $user->id));
    }

    public function create(User $user): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Resident) && $user->hasActiveContract();
    }

    public function review(User $user, MeterReadingSubmission $submission): bool
    {
        return $user->isActive() && $user->hasRole(UserRole::Admin);
    }
}
