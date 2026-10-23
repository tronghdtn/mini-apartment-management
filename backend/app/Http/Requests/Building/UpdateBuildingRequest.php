<?php

namespace App\Http\Requests\Building;

use App\Models\Building;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateBuildingRequest extends StoreBuildingRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', $this->route('building'));
    }

    public function rules(): array
    {
        $rules = parent::rules();
        $rules['name'] = ['sometimes', 'required', 'string', 'max:150', Rule::unique(Building::class, 'name')->ignore($this->route('building'))];
        $rules['address'] = ['sometimes', 'required', 'string', 'max:500'];
        $rules['total_floors'] = ['sometimes', 'required', 'integer', 'between:1,65535'];

        return $rules;
    }
}
