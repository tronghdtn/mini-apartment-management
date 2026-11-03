<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role->value,
            'status' => $this->status->value,
            // DB-D95: email hiện tại đã được chứng minh sở hữu qua liên kết.
            'email_verified' => $this->email !== null && $this->email_verified_at !== null,
        ];
    }
}
