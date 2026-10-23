<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'billing_type' => $this->billing_type->value,
            'unit' => $this->unit,
            'price' => $this->price,
            'status' => $this->status->value,
            'description' => $this->description,
        ];
    }
}
