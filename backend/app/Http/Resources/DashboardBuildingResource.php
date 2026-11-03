<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardBuildingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'rooms_count' => (int) $this->rooms_count,
            'rented_rooms_count' => (int) $this->rented_rooms_count, 'available_rooms_count' => (int) $this->available_rooms_count];
    }
}
