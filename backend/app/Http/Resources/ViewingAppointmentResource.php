<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ViewingAppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'code' => $this->code, 'guest_name' => $this->guest_name, 'guest_phone' => $this->guest_phone,
            'preferred_at' => $this->preferred_at->toISOString(), 'status' => $this->status->value,
            'room' => ['id' => $this->room->id, 'code' => $this->room->code, 'building_name' => $this->room->building->name],
            'checked_in_at' => $this->checked_in_at?->toISOString(), 'checked_out_at' => $this->checked_out_at?->toISOString(),
            'guard_note' => $this->when(in_array($request->user()?->role, [UserRole::Admin, UserRole::Guard], true), $this->guard_note),
            'admin_note' => $this->when($request->user()?->role === UserRole::Admin, $this->admin_note),
            'can_cancel' => $this->checked_in_at === null && in_array($this->status->value, ['pending', 'confirmed'], true)
                && ($request->user()?->role === UserRole::Admin || ($request->user() !== null && $this->preferred_at->isFuture() && $this->user_id === $request->user()->id)),
        ];
    }
}
