<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UtilityPriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'building_id' => $this->building_id,
            'building' => ['id' => $this->building->id, 'name' => $this->building->name],
            'service_id' => $this->service_id,
            'service' => [
                'id' => $this->service->id,
                'code' => $this->service->code,
                'name' => $this->service->name,
                'unit' => $this->service->unit,
            ],
            'unit_price' => $this->unit_price,
            'effective_from' => $this->effective_from->format('Y-m-d'),
        ];
    }
}
