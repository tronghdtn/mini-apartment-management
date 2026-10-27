<?php

namespace App\Policies;

use App\Models\Attachment;
use App\Models\MeterReadingSubmission;
use App\Models\User;

/** Only the approved U2 parent/collection is opened here. Other features stay closed. */
class AttachmentPolicy
{
    public function view(User $user, Attachment $attachment): bool
    {
        if (! $user->isActive() || $attachment->disk !== 'private'
            || $attachment->attachable_type !== 'meter_reading_submission'
            || $attachment->collection !== Attachment::METER_READING_PHOTO) {
            return false;
        }

        $submission = $attachment->attachable;

        return $submission instanceof MeterReadingSubmission && $user->can('view', $submission);
    }
}
