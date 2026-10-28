<?php

namespace App\Http\Requests\MeterReading;

use App\Enums\MeterReadingKind;
use App\Models\MeterReading;
use App\Rules\NotBoolean;
use App\Services\MeterReadingService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class MeterReadingRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewAny', MeterReading::class)) {
            return false;
        }
        app(MeterReadingService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        $identifier = ['bail', 'required', new NotBoolean, 'integer', 'min:1'];
        $date = ['bail', 'required', 'date_format:Y-m-d', 'after_or_equal:1000-01-01', 'before_or_equal:9999-12-31'];
        $period = [...$date, 'ends_with:-01'];
        $fields = ['room_id' => $identifier, 'service_id' => $identifier, 'period' => $period, 'reading_date' => $date,
            'current_reading' => ['required', 'string', 'regex:/^\d{1,8}(?:\.\d{1,2})?$/D']];
        $rules = match ($this->route()->getActionMethod()) {
            'store' => ['readings' => ['required', 'array', 'list', 'min:1', 'max:100'],
                'readings.*' => ['required', 'array:room_id,service_id,period,reading_date,current_reading'],
                ...collect($fields)->mapWithKeys(fn ($rule, $field) => ["readings.*.$field" => $rule])->all()],
            'context' => ['service_id' => $identifier, 'period' => $period, 'reading_date' => $date],
            'index' => ['building_id' => ['sometimes', new NotBoolean, 'integer', 'min:1'],
                'room_id' => ['sometimes', new NotBoolean, 'integer', 'min:1'],
                'service_id' => ['sometimes', new NotBoolean, 'integer', 'min:1'],
                'period' => ['sometimes', ...array_slice($period, 1)],
                'kind' => ['sometimes', Rule::enum(MeterReadingKind::class)],
                'page' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:2147483647']],
        };
        $allowed = array_filter(array_keys($rules), fn ($key) => ! str_contains($key, '.'));
        foreach (array_diff(array_keys($this->all()), $allowed) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => ':attribute là bắt buộc.', 'integer' => ':attribute phải là số nguyên.',
            'min' => ':attribute phải từ :min trở lên.', 'max' => ':attribute vượt giới hạn :max.',
            'date_format' => ':attribute phải đúng định dạng năm-tháng-ngày.',
            'after_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.', 'before_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.',
            'ends_with' => 'Kỳ tiêu thụ phải là ngày 01 của tháng.', 'regex' => 'Chỉ số phải từ 0 đến 99999999.99, tối đa hai số thập phân.',
            'string' => ':attribute phải là chuỗi.', 'array' => ':attribute phải đúng cấu trúc được hỗ trợ.',
            'list' => ':attribute phải là danh sách liên tiếp.', 'missing' => 'Không được gửi trường :attribute.',
            'enum' => ':attribute không hợp lệ.'];
    }

    public function attributes(): array
    {
        return ['readings' => 'Danh sách chỉ số', 'readings.*.room_id' => 'Phòng', 'readings.*.service_id' => 'Dịch vụ',
            'readings.*.period' => 'Kỳ tiêu thụ', 'readings.*.reading_date' => 'Ngày đo', 'readings.*.current_reading' => 'Chỉ số mới',
            'building_id' => 'Tòa nhà', 'room_id' => 'Phòng', 'service_id' => 'Dịch vụ', 'period' => 'Kỳ tiêu thụ',
            'reading_date' => 'Ngày đo', 'kind' => 'Loại chỉ số', 'page' => 'Trang'];
    }
}
