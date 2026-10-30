<?php

namespace App\Policies;

use App\Models\Attachment;
use App\Models\MaintenanceRequest;
use App\Models\MeterReadingSubmission;
use App\Models\Payment;
use App\Models\User;

/** A private file inherits access from its approved parent and exact collection. */
class AttachmentPolicy
{
    public function view(User $user, Attachment $attachment): bool
    {
        if (! $user->isActive() || $attachment->disk !== 'private') {
            return false;
        }

        if ($attachment->attachable_type === 'payment' && $attachment->collection === Attachment::PAYMENT_PROOF) {
            $payment = $attachment->attachable;

            return $payment instanceof Payment && $user->can('view', $payment);
        }

        if ($attachment->attachable_type === 'maintenance_request' && $attachment->collection === Attachment::MAINTENANCE_PHOTO) {
            $maintenanceRequest = $attachment->attachable;

            return $maintenanceRequest instanceof MaintenanceRequest && $user->can('view', $maintenanceRequest);
        }

        if ($attachment->attachable_type !== 'meter_reading_submission' || $attachment->collection !== Attachment::METER_READING_PHOTO) {
            return false;
        }

        $submission = $attachment->attachable;

        return $submission instanceof MeterReadingSubmission && $user->can('view', $submission);
    }
}
