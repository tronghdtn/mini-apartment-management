<?php

namespace App\Http\Requests\Setting;

use App\Models\Setting;
use App\Rules\NotBoolean;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateDaysSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', Setting::class);
    }

    public function rules(): array
    {
        return [
            'value' => ['required', new NotBoolean, 'integer', 'between:1,365'],
            'key' => ['missing'],
            'type' => ['missing'],
            'group' => ['missing'],
            'id' => ['missing'],
        ];
    }

    public function messages(): array
    {
        return [
            'value.required' => 'Vui lòng nhập số ngày.',
            'value.integer' => 'Số ngày phải là số nguyên.',
            'value.between' => 'Số ngày phải từ 1 đến 365.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }
}
