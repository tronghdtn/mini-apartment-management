<?php

namespace App\Http\Requests\Service;

use App\Models\Service;
use App\Rules\NotBoolean;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateServiceRequest extends StoreServiceRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', $this->route('service'));
    }

    public function rules(): array
    {
        $rules = parent::rules();
        $rules['name'] = ['sometimes', 'required', 'string', 'max:120', Rule::unique(Service::class, 'name')->ignore($this->route('service'))];
        $rules['price'] = $this->route('service')->isMetered()
            ? ['missing']
            : ['sometimes', 'required', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991'];
        foreach (['code', 'billing_type', 'unit'] as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }
}
