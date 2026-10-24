<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use App\Rules\NotBoolean;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateDraftServicesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Contract::class);
    }

    public function rules(): array
    {
        $rules = [
            'services' => ['present', 'array', 'list'],
            'services.*' => ['required', 'array:service_id,quantity'],
            'services.*.service_id' => ['required', new NotBoolean, 'integer', 'min:1', 'distinct:strict'],
            'services.*.quantity' => ['required', new NotBoolean, 'integer', 'between:1,99999999'],
        ];
        foreach (array_diff(array_keys($this->all()), ['services']) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'services.present' => 'Danh sách dịch vụ là bắt buộc; gửi mảng rỗng nếu muốn gỡ dịch vụ.',
            'array' => ':attribute phải là mảng với đúng các trường được phép.',
            'list' => ':attribute phải là danh sách liên tiếp.',
            'required' => ':attribute là bắt buộc.',
            'integer' => ':attribute phải là số nguyên.',
            'min' => ':attribute phải từ :min trở lên.',
            'between' => ':attribute phải từ :min đến :max.',
            'distinct' => 'Không được chọn trùng dịch vụ.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return ['services' => 'Dịch vụ', 'services.*.service_id' => 'Dịch vụ', 'services.*.quantity' => 'Số lượng'];
    }
}
