<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use App\Rules\NotBoolean;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class ConfirmDepositRefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Contract::class);
    }

    public function rules(): array
    {
        $rules = [
            'expected_revision' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'],
            'expected_refund_amount' => ['required', new NotBoolean, 'integer', 'min:1', 'max:9007199254740991'],
            'confirmed_paid' => ['required', 'boolean', 'accepted'],
        ];
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.', 'string' => ':attribute không hợp lệ.',
            'regex' => 'Cần tải lại đối soát trước khi xác nhận hoàn cọc.',
            'integer' => ':attribute phải là số nguyên VND.', 'min' => ':attribute phải lớn hơn 0.',
            'max' => ':attribute vượt giới hạn cho phép.', 'boolean' => 'Xác nhận hoàn cọc không hợp lệ.',
            'accepted' => 'Cần xác nhận đã hoàn đủ tiền cọc ngoài hệ thống.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return ['expected_revision' => 'Phiên bản đối soát', 'expected_refund_amount' => 'Số cọc đang đối chiếu', 'confirmed_paid' => 'Xác nhận đã hoàn tiền'];
    }
}
