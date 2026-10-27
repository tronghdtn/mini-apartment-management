<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use App\Rules\MaxTextBytes;
use App\Rules\NotBoolean;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class ContractLifecycleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Contract::class);
    }

    public function rules(): array
    {
        $reading = ['required', 'string', 'regex:/^\d{1,8}(?:\.\d{1,2})?$/D'];
        $rules = match ($this->route()->getActionMethod()) {
            'updateTerms' => [
                'early_termination_fee_type' => ['present', 'nullable', 'string'],
                'early_termination_fee_amount' => ['nullable', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991'],
                'early_termination_fee_multiplier' => ['nullable', 'string'],
                'early_termination_waiver_conditions' => ['nullable', 'array', 'list'],
                'early_termination_waiver_conditions.*' => ['required', 'array:code,description'],
                'early_termination_waiver_conditions.*.code' => ['required', 'string'],
                'early_termination_waiver_conditions.*.description' => ['required', 'string'],
            ],
            'confirmDeposit' => [
                'expected_revision' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'],
                'confirmed' => ['required', 'boolean', 'accepted'],
                'expected_amount' => ['required', new NotBoolean, 'integer', 'min:1', 'max:9007199254740991'],
            ],
            'activate' => [
                'expected_revision' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'],
                'initial_electricity_reading' => $reading,
                'initial_water_reading' => $reading,
                'meter_gap_reason' => ['nullable', 'string', new MaxTextBytes],
                'meter_gap_confirmed' => ['required', 'boolean'],
            ],
        };
        $allowed = array_filter(array_keys($rules), fn ($field) => ! str_contains($field, '.'));
        foreach (array_diff(array_keys($this->all()), $allowed) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.', 'present' => ':attribute phải được gửi rõ ràng.',
            'accepted' => 'Phải xác nhận đã thực nhận đủ tiền cọc.', 'boolean' => ':attribute phải là giá trị xác nhận hợp lệ.',
            'integer' => ':attribute phải là số nguyên đồng VND.', 'string' => ':attribute phải là chuỗi ký tự.',
            'regex' => ':attribute phải từ 0 đến 99999999.99, tối đa hai chữ số thập phân.',
            'expected_revision.regex' => 'Phiên bản hợp đồng không hợp lệ. Vui lòng tải lại dữ liệu.',
            'min' => ':attribute phải từ :min trở lên.', 'max' => ':attribute vượt giới hạn :max.',
            'array' => ':attribute phải có đúng cấu trúc được hỗ trợ.', 'list' => ':attribute phải là danh sách liên tiếp.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return [
            'initial_electricity_reading' => 'Chỉ số điện đầu', 'initial_water_reading' => 'Chỉ số nước đầu',
            'meter_gap_reason' => 'Lý do chênh lệch', 'meter_gap_confirmed' => 'Xác nhận chênh lệch',
            'confirmed' => 'Xác nhận nhận cọc', 'expected_amount' => 'Số tiền cọc đã hiển thị',
            'early_termination_fee_type' => 'Loại phí', 'early_termination_waiver_conditions' => 'Điều kiện miễn phí',
        ];
    }
}
