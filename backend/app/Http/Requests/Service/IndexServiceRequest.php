<?php

namespace App\Http\Requests\Service;

use App\Models\Service;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class IndexServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Service::class);
    }

    public function rules(): array
    {
        return ['page' => ['sometimes', 'integer', 'min:1']];
    }

    public function messages(): array
    {
        return ['page.integer' => 'Trang phải là số nguyên.', 'page.min' => 'Trang phải từ 1 trở lên.'];
    }
}
