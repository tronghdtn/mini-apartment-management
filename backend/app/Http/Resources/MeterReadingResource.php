<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MeterReadingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'room_id' => $this->room_id,
            'room' => ['id' => $this->room->id, 'code' => $this->room->code, 'building_id' => $this->room->building_id,
                'building_name' => $this->room->building->name],
            'contract_id' => $this->contract_id, 'invoice_id' => $this->invoice_id,
            'service_id' => $this->service_id, 'service' => ['id' => $this->service->id, 'code' => $this->service->code,
                'name' => $this->service->name, 'unit' => $this->service->unit],
            'kind' => $this->kind->value, 'period' => $this->period->format('Y-m-d'),
            'reading_date' => $this->reading_date->format('Y-m-d'), 'previous_reading' => $this->previous_reading,
            'current_reading' => $this->current_reading, 'consumption' => $this->consumption,
            'unit_price' => $this->unit_price, 'amount' => $this->amount];
    }
}
