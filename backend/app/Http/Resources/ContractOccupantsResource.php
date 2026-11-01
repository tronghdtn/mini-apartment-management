<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContractOccupantsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return collect($this->resource)->only(['contract_id', 'contract_status', 'occupant_count', 'max_occupants',
            'registered_count', 'has_count_mismatch', 'can_edit', 'revision', 'occupants'])->all();
    }
}
