<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lifecycle_revision' => $this->relationLoaded('contractServices') ? $this->lifecycleRevision() : null,
            'contract_number' => $this->contract_number,
            'room_id' => $this->room_id,
            'user_id' => $this->user_id,
            'status' => $this->status->value,
            'start_date' => $this->start_date->format('Y-m-d'),
            'end_date' => $this->end_date->format('Y-m-d'),
            'actual_end_date' => $this->actual_end_date?->format('Y-m-d'),
            'monthly_rent' => $this->monthly_rent,
            'deposit_amount' => $this->deposit_amount,
            'deposit_status' => $this->deposit_status->value,
            'deposit_paid_at' => $this->deposit_paid_at?->utc()->toISOString(),
            'activated_at' => $this->activated_at?->utc()->toISOString(),
            'early_termination_fee_type' => $this->early_termination_fee_type?->value,
            'early_termination_fee_amount' => $this->early_termination_fee_amount,
            'early_termination_fee_multiplier' => $this->early_termination_fee_multiplier,
            'early_termination_waiver_conditions' => $this->early_termination_waiver_conditions,
            'meter_gap_reason' => $this->meter_gap_reason,
            'meter_gap_confirmed_by' => $this->meter_gap_confirmed_by,
            'occupant_count' => $this->occupant_count,
            'initial_electricity_reading' => $this->initial_electricity_reading,
            'initial_water_reading' => $this->initial_water_reading,
            'note' => $this->note,
            'created_at' => $this->created_at?->utc()->toISOString(),
            'updated_at' => $this->updated_at?->utc()->toISOString(),
            'contract_services' => $this->whenLoaded('contractServices', fn () => $this->contractServices->map(fn ($line) => [
                'id' => $line->id, 'service_id' => $line->service_id,
                'quantity' => $line->quantity, 'unit_price' => $line->unit_price,
                'start_date' => $line->start_date->format('Y-m-d'), 'end_date' => $line->end_date?->format('Y-m-d'),
                'service' => ['code' => $line->service->code, 'name' => $line->service->name, 'unit' => $line->service->unit,
                    'billing_type' => $line->service->billing_type->value, 'status' => $line->service->status->value],
            ])),
            'room' => [
                'id' => $this->room->id,
                'code' => $this->room->code,
                'status' => $this->room->status->value,
                'max_occupants' => $this->room->max_occupants,
                'building' => ['id' => $this->room->building->id, 'name' => $this->room->building->name],
            ],
            'tenant' => [
                'id' => $this->tenant->id,
                'full_name' => $this->tenant->full_name,
                'phone' => $this->tenant->phone,
                'email' => $this->tenant->email,
                'role' => $this->tenant->role->value,
                'status' => $this->tenant->status->value,
            ],
        ];
    }
}
