<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use App\Rules\MaxTextBytes;
use App\Rules\NotBoolean;
use App\Services\FinalMeterReadingPreviewService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class FinalMeterPreviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewAny', Contract::class)) {
            return false;
        }
        app(FinalMeterReadingPreviewService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        $rules = [
            'actual_end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:1000-01-01', 'before_or_equal:9999-12-31'],
            'closure_note' => ['nullable', 'string', new MaxTextBytes],
            'expected_revision' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'],
            'electricity_reading' => ['required', 'string', new NotBoolean, 'regex:/^\d{1,8}(?:\.\d{1,2})?$/D'],
            'water_reading' => ['required', 'string', new NotBoolean, 'regex:/^\d{1,8}(?:\.\d{1,2})?$/D'],
        ];
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => 'Vui lòng nhập :attribute.', 'date_format' => ':attribute phải là ngày tồn tại theo YYYY-MM-DD.',
            'after_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.', 'before_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.',
            'string' => ':attribute phải là chuỗi.', 'regex' => ':attribute không đúng định dạng hoặc hợp đồng vừa thay đổi.',
            'missing' => 'Không được gửi trường :attribute.'];
    }

    public function attributes(): array
    {
        return ['actual_end_date' => 'ngày bàn giao', 'closure_note' => 'ghi chú bàn giao',
            'expected_revision' => 'phiên bản hợp đồng', 'electricity_reading' => 'chỉ số điện cuối', 'water_reading' => 'chỉ số nước cuối'];
    }
}
