<?php

namespace App\Http\Resources;

use App\Enums\MaintenanceRequestStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $actor = $request->user();
        $isAdmin = $actor?->hasRole(UserRole::Admin) ?? false;
        $isAssignedTechnician = $actor?->hasRole(UserRole::Technician) && (int) $this->assigned_to === (int) $actor->id;
        $showPhone = $isAdmin || ($isAssignedTechnician && in_array($this->status,
            [MaintenanceRequestStatus::Pending, MaintenanceRequestStatus::InProgress], true));
        $reporter = null;
        if ($isAdmin || $isAssignedTechnician) {
            $reporter = ['full_name' => $this->reporter?->full_name];
            if ($showPhone) {
                $reporter['phone'] = $this->reporter?->phone;
            }
        }

        $attachments = $this->whenLoaded('attachments', fn () => $this->attachments
            ->where('collection', Attachment::MAINTENANCE_PHOTO)->where('disk', 'private')
            ->sortBy('sort_order')->values()->map(fn (Attachment $attachment) => [
                'id' => $attachment->id,
                'url' => '/api/v1/maintenance-requests/'.$this->id.'/attachments/'.$attachment->id,
                'mime_type' => $attachment->mime_type,
                'size_bytes' => $attachment->size_bytes,
            ]));

        return ['id' => $this->id, 'code' => $this->code, 'title' => $this->title, 'description' => $this->description,
            'priority' => $this->priority->value, 'status' => $this->status->value,
            'room' => ['id' => $this->room->id, 'code' => $this->room->code, 'building_name' => $this->room->building->name],
            'reporter' => $reporter,
            'assignee' => $this->assigned_to === null ? null : ['id' => $this->assigned_to, 'full_name' => $this->assignee?->full_name],
            'admin_note' => $this->admin_note, 'handler_note' => $this->handler_note,
            'assigned_at' => $this->assigned_at?->toISOString(), 'started_at' => $this->started_at?->toISOString(),
            'resolved_at' => $this->resolved_at?->toISOString(), 'created_at' => $this->created_at?->toISOString(),
            'photos' => $attachments];
    }
}
