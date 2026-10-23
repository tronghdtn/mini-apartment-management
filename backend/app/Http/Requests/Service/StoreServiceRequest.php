<?php

namespace App\Http\Requests\Service;

use App\Enums\ServiceBillingType;
use App\Models\Service;
use App\Rules\MaxTextBytes;
use App\Rules\NotBoolean;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', Service::class);
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => mb_strtoupper(trim($this->input('code')))]);
        }
    }

    public function rules(): array
    {
        return [
            'code' => ['bail', 'required', 'string', 'max:50', Rule::notIn([Service::CODE_ELECTRICITY, Service::CODE_WATER]), Rule::unique(Service::class, 'code')],
            'name' => ['required', 'string', 'max:120', Rule::unique(Service::class, 'name')],
            'billing_type' => ['required', Rule::in([ServiceBillingType::PerRoom->value, ServiceBillingType::PerPerson->value, ServiceBillingType::PerUnit->value])],
            'unit' => ['nullable', 'string', 'max:20'],
            'price' => ['required', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991'],
            'description' => ['nullable', 'string', new MaxTextBytes],
            'id' => ['missing'],
            'status' => ['missing'],
            'is_system' => ['missing'],
            'contract_services' => ['missing'],
            'utility_prices' => ['missing'],
            'created_at' => ['missing'],
            'updated_at' => ['missing'],
        ];
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute không được vượt quá :max.',
            'integer' => ':attribute phải là số nguyên.',
            'min' => ':attribute phải từ :min trở lên.',
            'code.not_in' => 'Mã này dành riêng cho dịch vụ hệ thống.',
            'code.unique' => 'Mã dịch vụ đã được sử dụng.',
            'name.unique' => 'Tên dịch vụ đã được sử dụng.',
            'billing_type.in' => 'Chỉ được tạo dịch vụ theo phòng, theo người hoặc theo đơn vị.',
            'price.max' => 'Giá niêm yết vượt khả năng biểu diễn chính xác của giao diện.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return ['code' => 'Mã dịch vụ', 'name' => 'Tên dịch vụ', 'billing_type' => 'Cách tính phí', 'unit' => 'Đơn vị', 'price' => 'Giá niêm yết', 'description' => 'Mô tả'];
    }
}
