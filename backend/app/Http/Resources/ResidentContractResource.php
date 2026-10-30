<?php

namespace App\Http\Resources;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResidentContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = ['id' => $this->id, 'contract_number' => $this->contract_number, 'status' => $this->status->value,
            'start_date' => $this->start_date->format('Y-m-d'), 'end_date' => $this->end_date->format('Y-m-d'),
            'planned_handover_date' => CarbonImmutable::parse($this->end_date->format('Y-m-d'))->addDay()->format('Y-m-d'),
            'actual_end_date' => $this->actual_end_date?->format('Y-m-d'), 'monthly_rent' => $this->monthly_rent,
            'deposit_amount' => $this->deposit_amount, 'deposit_status' => $this->deposit_status->value,
            'room' => ['code' => $this->room->code, 'building_name' => $this->room->building->name, 'address' => $this->room->building->address]];
        if ($this->relationLoaded('contractServices')) {
            $data += ['occupant_count' => $this->occupant_count,
                'occupants' => $this->occupants->map(fn ($occupant) => ['full_name' => $occupant->full_name, 'relationship' => $occupant->relationship]),
                'initial_electricity_reading' => $this->initial_electricity_reading, 'initial_water_reading' => $this->initial_water_reading,
                'early_termination_fee_type' => $this->early_termination_fee_type?->value,
                'early_termination_fee_amount' => $this->early_termination_fee_amount,
                'early_termination_fee_multiplier' => $this->early_termination_fee_multiplier,
                'early_termination_waiver_conditions' => collect($this->early_termination_waiver_conditions ?? [])->map(fn ($condition) => [
                    'code' => $condition['code'], 'description' => $condition['description'],
                ]),
                'deposit_paid_at' => $this->deposit_paid_at?->toISOString(), 'deposit_settled_at' => $this->deposit_settled_at?->toISOString(),
                'deposit_deducted_amount' => $this->deposit_deducted_amount, 'deposit_refund_amount' => $this->deposit_refund_amount,
                'closure_reason' => $this->closure_reason,
                'inspection_result' => $this->getRawOriginal('inspection_result'),
                'final_invoice_id' => $this->invoices->first()?->id,
                'contract_services' => $this->contractServices->map(fn ($line) => ['id' => $line->id, 'name' => $line->service->name,
                    'billing_type' => $line->service->billing_type->value, 'unit' => $line->service->unit,
                    'quantity' => $line->quantity, 'unit_price' => $line->unit_price,
                    'start_date' => $line->start_date->format('Y-m-d'), 'end_date' => $line->end_date?->format('Y-m-d')]),
            ];
        }

        return $data;
    }
}
