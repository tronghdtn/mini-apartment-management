<?php

namespace App\Http\Requests\UtilityPrice;

use App\Models\UtilityPrice;
use App\Services\UtilityPriceService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class IndexUtilityPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewAny', UtilityPrice::class)) {
            return false;
        }
        app(UtilityPriceService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        return ['service_id' => ['sometimes', 'integer', 'min:1'], 'page' => ['sometimes', 'integer', 'min:1']];
    }

    public function messages(): array
    {
        return ['integer' => ':attribute phải là số nguyên.', 'min' => ':attribute phải từ :min trở lên.'];
    }

    public function attributes(): array
    {
        return ['service_id' => 'Dịch vụ', 'page' => 'Trang'];
    }
}
