<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AdminUserDetailResource extends AdminUserResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'id_number' => $this->id_number,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
            'gender' => $this->gender,
            'permanent_address' => $this->permanent_address,
        ];
    }
}
