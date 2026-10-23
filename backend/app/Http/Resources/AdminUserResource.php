<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $contract = $this->activeContract;

        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role->value,
            'status' => $this->status->value,
            'created_at' => $this->created_at?->utc()->toISOString(),
            'has_active_contract' => $contract !== null,
            'active_contract' => $contract === null ? null : [
                'id' => $contract->id,
                'room' => [
                    'id' => $contract->room->id,
                    'code' => $contract->room->code,
                    'building' => [
                        'id' => $contract->room->building->id,
                        'name' => $contract->room->building->name,
                    ],
                ],
            ],
        ];
    }
}
