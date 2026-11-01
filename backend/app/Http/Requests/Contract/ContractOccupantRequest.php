<?php

namespace App\Http\Requests\Contract;

use App\Enums\UserRole;
use App\Rules\NotBoolean;
use Illuminate\Foundation\Http\FormRequest;

class ContractOccupantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isActive() && $this->user()->role === UserRole::Admin;
    }

    protected function prepareForValidation(): void
    {
        $values = [];
        foreach (['full_name', 'phone', 'relationship'] as $field) {
            if (is_string($this->input($field))) {
                $value = trim($this->input($field));
                $values[$field] = $field !== 'full_name' && $value === '' ? null : $value;
            }
        }
        $this->merge($values);
    }

    public function rules(): array
    {
        $rules = [];
        if (! $this->isMethod('GET')) {
            $rules['expected_revision'] = ['required', 'string', 'regex:/^[a-f0-9]{64}$/'];
        }
        if ($this->isMethod('POST') || $this->isMethod('PATCH')) {
            $rules += ['full_name' => ['required', 'string', 'max:120'],
                'phone' => ['sometimes', 'nullable', new NotBoolean, 'string', 'max:20'],
                'relationship' => ['sometimes', 'nullable', 'string', 'max:50']];
        }
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => 'Vui lòng nhập :attribute.', 'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute không được quá :max ký tự.', 'regex' => 'Phiên bản dữ liệu không hợp lệ. Vui lòng tải lại.',
            'missing' => 'Không được gửi trường :attribute.'];
    }

    public function attributes(): array
    {
        return ['full_name' => 'họ tên', 'phone' => 'số điện thoại', 'relationship' => 'quan hệ với người đại diện',
            'expected_revision' => 'phiên bản danh sách đã đọc'];
    }
}
