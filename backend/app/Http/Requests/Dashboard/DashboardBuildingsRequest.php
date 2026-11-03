<?php

namespace App\Http\Requests\Dashboard;

use App\Rules\NotBoolean;
use Illuminate\Validation\Validator;

class DashboardBuildingsRequest extends DashboardRequest
{
    public function rules(): array
    {
        return ['page' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:2147483647']];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['page']) as $field) {
                $validator->errors()->add($field, 'Bảng tổng quan tòa nhà chỉ nhận số trang.');
            }
        }];
    }

    public function messages(): array
    {
        return ['integer' => 'Số trang phải là số nguyên.', 'min' => 'Số trang phải từ 1.', 'max' => 'Số trang vượt giới hạn.'];
    }
}
