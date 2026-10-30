<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class TerminateContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Contract::class);
    }

    public function rules(): array
    {
        $rules = ['expected_revision' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'], 'confirmed' => ['required', 'boolean', 'accepted']];
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['expected_revision.required' => 'Cần tải đối soát trước khi thanh lý.', 'expected_revision.string' => 'Phiên bản đối soát không hợp lệ.',
            'expected_revision.regex' => 'Phiên bản đối soát không hợp lệ.', 'confirmed.required' => 'Cần xác nhận thanh lý hợp đồng.',
            'confirmed.boolean' => 'Xác nhận thanh lý không hợp lệ.', 'confirmed.accepted' => 'Cần xác nhận thanh lý hợp đồng.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.'];
    }
}
