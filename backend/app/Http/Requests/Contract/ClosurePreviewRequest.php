<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use App\Rules\MaxTextBytes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class ClosurePreviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Contract::class);
    }

    public function rules(): array
    {
        $rules = [
            'actual_end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:1000-01-01', 'before_or_equal:9999-12-31'],
            'closure_note' => ['nullable', 'string', new MaxTextBytes],
            'expected_revision' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'],
        ];
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => ':attribute là bắt buộc.', 'date_format' => ':attribute phải là ngày tồn tại theo YYYY-MM-DD.',
            'after_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.', 'before_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.',
            'string' => ':attribute phải là chuỗi.', 'regex' => 'Phiên bản hợp đồng không hợp lệ. Vui lòng tải lại.',
            'missing' => 'Không được gửi trường :attribute.'];
    }

    public function attributes(): array
    {
        return ['actual_end_date' => 'Ngày bàn giao', 'closure_note' => 'Lý do bàn giao', 'expected_revision' => 'Phiên bản hợp đồng'];
    }
}
