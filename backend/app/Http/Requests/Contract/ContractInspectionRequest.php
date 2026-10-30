<?php

namespace App\Http\Requests\Contract;

use App\Enums\InspectionResult;
use App\Models\Contract;
use App\Rules\MaxTextBytes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ContractInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Contract::class);
    }

    public function rules(): array
    {
        $rules = [
            'inspection_result' => ['required', Rule::enum(InspectionResult::class)],
            'inspection_note' => ['nullable', 'string', new MaxTextBytes],
            'expected_revision' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'],
            'photos' => ['sometimes', 'array', 'max:5'],
            'photos.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => 'Vui lòng nhập :attribute.', 'enum' => 'Kết quả kiểm tra không hợp lệ.',
            'regex' => 'Hợp đồng vừa thay đổi. Vui lòng tải lại.', 'missing' => 'Không được gửi trường :attribute.',
            'mimes' => 'Ảnh phải có định dạng JPG, PNG hoặc WebP.', 'max' => 'Ảnh vượt quá 5 MB hoặc số lượng ảnh vượt quá 5.'];
    }

    public function attributes(): array
    {
        return ['inspection_result' => 'kết quả kiểm tra', 'inspection_note' => 'ghi chú kiểm tra',
            'expected_revision' => 'phiên bản hợp đồng', 'photos' => 'ảnh kiểm tra'];
    }
}
