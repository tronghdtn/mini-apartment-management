<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicRoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'floor_number' => $this->floor_number,
            'area' => $this->area, 'base_price' => $this->base_price,
            'deposit_amount' => $this->deposit_amount, 'max_occupants' => $this->max_occupants,
            'description' => $this->description,
            'building' => [
                'id' => $this->building->id, 'name' => $this->building->name,
                'address' => $this->building->address, 'latitude' => $this->building->latitude,
                'longitude' => $this->building->longitude,
            ],
            'amenities' => $this->resource->allAmenities()->sortBy('id')->values()
                ->map->only(['id', 'name', 'description'])->all(),
        ];
    }
}
