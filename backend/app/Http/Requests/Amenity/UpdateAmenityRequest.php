<?php

namespace App\Http\Requests\Amenity;

use App\Models\Amenity;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateAmenityRequest extends StoreAmenityRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', $this->route('amenity'));
    }

    public function rules(): array
    {
        $rules = parent::rules();
        $rules['name'] = ['sometimes', 'required', 'string', 'max:120', Rule::unique(Amenity::class, 'name')->ignore($this->route('amenity'))];

        return $rules;
    }
}
