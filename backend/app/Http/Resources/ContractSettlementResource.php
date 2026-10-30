<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContractSettlementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Service returns an explicit projection, never raw models or personal data.
        return $this->resource;
    }
}
