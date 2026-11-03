<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isActive() === true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('full_name'))) {
            $this->merge(['full_name' => trim($this->input('full_name'))]);
        }
    }

    public function rules(): array
    {
        return ['full_name' => ['required', 'string', 'max:120']];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            // Inspect literal keys: Laravel rule paths would interpret dots as nested input.
            foreach (array_diff(array_keys($this->all()), ['full_name']) as $field) {
                $validator->errors()->add($field, 'Chỉ được cập nhật họ và tên tại đây.');
            }
        }];
    }

    public function messages(): array
    {
        return ['full_name.required' => 'Vui lòng nhập họ và tên.', 'full_name.string' => 'Họ tên phải là chuỗi ký tự.',
            'full_name.max' => 'Họ tên tối đa 120 ký tự.'];
    }
}
