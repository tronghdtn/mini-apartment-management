<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'building_id' => $this->building_id,
            'building' => ['id' => $this->building->id, 'name' => $this->building->name],
            'code' => $this->code,
            'floor_number' => $this->floor_number,
            'area' => $this->area,
            'base_price' => $this->base_price,
            'deposit_amount' => $this->deposit_amount,
            'max_occupants' => $this->max_occupants,
            'status' => $this->status->value,
            'is_public' => $this->is_public,
            'description' => $this->description,
            'photos' => RoomPhotoResource::collection($this->whenLoaded('photos', default: collect())),
        ];
    }
}
