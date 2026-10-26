<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicRoomFiltersResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['buildings' => $this->resource['buildings'], 'amenities' => $this->resource['amenities']];
    }
}
