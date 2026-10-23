<?php

namespace App\Http\Resources;

use App\Models\Amenity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AmenityAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $result = [];
        foreach (['direct', 'inherited', 'effective'] as $source) {
            $result[$source] = $this->resource[$source]->map(fn (Amenity $amenity): array => [
                'id' => $amenity->id,
                'name' => $amenity->name,
                'description' => $amenity->description,
                'is_archived' => $amenity->trashed(),
            ])->values()->all();
        }

        return $result;
    }
}
