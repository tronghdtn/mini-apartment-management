<?php

namespace App\Http\Requests\UtilityPrice;

use App\Enums\ServiceBillingType;
use App\Models\Service;
use App\Models\UtilityPrice;
use App\Rules\NotBoolean;
use App\Services\UtilityPriceService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreUtilityPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('create', UtilityPrice::class)) {
            return false;
        }
        app(UtilityPriceService::class)->ensureReady(forWrite: true);

        return true;
    }

    public function rules(): array
    {
        $serviceId = is_scalar($this->input('service_id')) ? filter_var($this->input('service_id'), FILTER_VALIDATE_INT) : false;

        return [
            'service_id' => ['bail', 'required', 'integer', 'min:1', Rule::exists(Service::class, 'id')->where('billing_type', ServiceBillingType::Metered->value)],
            'unit_price' => ['required', new NotBoolean, 'integer', 'min:1', 'max:9007199254740991'],
            'effective_from' => ['bail', 'required', 'date_format:Y-m-d', 'after_or_equal:1000-01-01', 'before_or_equal:9999-12-31', 'ends_with:-01', Rule::unique(UtilityPrice::class, 'effective_from')->where('service_id', $serviceId === false ? 0 : $serviceId)],
            'id' => ['missing'],
            'service' => ['missing'],
            'status' => ['missing'],
            'meter_readings' => ['missing'],
            'created_at' => ['missing'],
            'updated_at' => ['missing'],
        ];
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.',
            'integer' => ':attribute phải là số nguyên.',
            'min' => ':attribute phải từ :min trở lên.',
            'service_id.exists' => 'Chỉ được thêm giá cho dịch vụ điện nước tính theo chỉ số.',
            'effective_from.date_format' => 'Ngày hiệu lực phải đúng định dạng năm-tháng-ngày.',
            'effective_from.after_or_equal' => 'Ngày hiệu lực nằm ngoài phạm vi ngày lưu trữ được hỗ trợ (năm 1000–9999).',
            'effective_from.before_or_equal' => 'Ngày hiệu lực nằm ngoài phạm vi ngày lưu trữ được hỗ trợ (năm 1000–9999).',
            'effective_from.ends_with' => 'Ngày hiệu lực phải là ngày 01 của tháng.',
            'effective_from.unique' => 'Dịch vụ đã có giá cho ngày hiệu lực này.',
            'unit_price.max' => 'Đơn giá vượt khả năng biểu diễn chính xác của giao diện.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return ['service_id' => 'Dịch vụ', 'unit_price' => 'Đơn giá', 'effective_from' => 'Ngày hiệu lực'];
    }
}
