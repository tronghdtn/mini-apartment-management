<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'period' => $this->resource['period'],
            'rented_rooms_count' => $this->resource['rented_rooms_count'],
            'received_amount' => $this->resource['received_amount'],
            'outstanding_amount' => $this->resource['outstanding_amount'],
            'pending_maintenance_count' => $this->resource['pending_maintenance_count'],
        ];
    }
}
