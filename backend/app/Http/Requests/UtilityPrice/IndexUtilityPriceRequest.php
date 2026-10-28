<?php

namespace App\Http\Requests\UtilityPrice;

use App\Models\Building;
use App\Models\UtilityPrice;
use App\Rules\NotBoolean;
use App\Services\UtilityPriceService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

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
        return ['building_id' => ['sometimes', new NotBoolean, 'integer', 'min:1', Rule::exists(Building::class, 'id')], 'service_id' => ['sometimes', 'integer', 'min:1'], 'page' => ['sometimes', 'integer', 'min:1']];
    }

    public function messages(): array
    {
        return ['integer' => ':attribute phải là số nguyên.', 'min' => ':attribute phải từ :min trở lên.', 'building_id.exists' => 'Tòa nhà không tồn tại.'];
    }

    public function attributes(): array
    {
        return ['building_id' => 'Tòa nhà', 'service_id' => 'Dịch vụ', 'page' => 'Trang'];
    }
}
