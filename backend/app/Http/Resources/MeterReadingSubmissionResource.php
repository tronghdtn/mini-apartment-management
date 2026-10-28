<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MeterReadingSubmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'contract_id' => $this->contract_id,
            'room' => ['id' => $this->room_id, 'code' => $this->room->code, 'building_name' => $this->room->building->name],
            'service' => ['id' => $this->service_id, 'name' => $this->service->name, 'unit' => $this->service->unit],
            'period' => $this->period->format('Y-m-d'), 'reading_date' => $this->reading_date->format('Y-m-d'),
            'current_reading' => $this->current_reading, 'status' => $this->status->value,
            'submitted_at' => $this->created_at?->toISOString(), 'reviewed_at' => $this->reviewed_at?->toISOString(),
            'reviewed_by' => $this->reviewed_by, 'rejection_reason' => $this->rejection_reason,
            'approved_meter_reading_id' => $this->approved_meter_reading_id,
            'photo_url' => '/api/v1/meter-reading-submissions/'.$this->id.'/photo'];
    }
}
