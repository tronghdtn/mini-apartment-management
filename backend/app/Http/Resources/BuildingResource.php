<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BuildingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'total_floors' => $this->total_floors,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'description' => $this->description,
            'status' => $this->status->value,
        ];
    }
}
