<?php

namespace App\Http\Resources;

use App\Models\Attachment;
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
                'inspection_result' => $this->inspection_result?->value,
                'inspected_at' => $this->inspected_at?->utc()->toISOString(),
                'inspection_note' => $this->inspection_note,
                'inspection_photos' => $this->whenLoaded('attachments', fn () => $this->attachments
                    ->where('collection', Attachment::CONTRACT_INSPECTION_PHOTO)->where('disk', 'private')
                    ->sortBy('sort_order')->values()->map(fn (Attachment $attachment) => [
                        'id' => $attachment->id,
                        'url' => '/api/v1/contracts/'.$this->id.'/attachments/'.$attachment->id,
                        'mime_type' => $attachment->mime_type,
                        'size_bytes' => $attachment->size_bytes,
                    ])),
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
