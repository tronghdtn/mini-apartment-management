<?php

namespace App\Http\Requests\MeterReadingSubmission;

use App\Enums\MeterReadingSubmissionStatus;
use App\Enums\UserRole;
use App\Models\MeterReadingSubmission;
use App\Rules\NotBoolean;
use App\Services\MeterReadingSubmissionService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SubmissionRequest extends FormRequest
{
    private ?MeterReadingSubmission $resolvedSubmission = null;

    public function submission(): MeterReadingSubmission
    {
        return $this->resolvedSubmission ?? abort(404);
    }

    public function authorize(): bool
    {
        $action = $this->route()->getActionMethod();
        if (! Gate::allows(in_array($action, ['store', 'context'], true) ? 'create' : 'viewAny', MeterReadingSubmission::class)
            || (in_array($action, ['approve', 'reject'], true) && ! $this->user()->hasRole(UserRole::Admin))) {
            return false;
        }
        // Check schema before querying a route ID; implicit model binding would query an absent pending table.
        app(MeterReadingSubmissionService::class)->ensureReady();
        if (in_array($action, ['show', 'photo', 'approve', 'reject'], true)) {
            $this->resolvedSubmission = MeterReadingSubmission::findOrFail((int) $this->route('submission'));

            return Gate::allows(in_array($action, ['show', 'photo'], true) ? 'view' : 'review', $this->resolvedSubmission);
        }

        return true;
    }

    public function rules(): array
    {
        $date = ['bail', 'required', 'date_format:Y-m-d', 'after_or_equal:1000-01-01', 'before_or_equal:9999-12-31'];
        $rules = match ($this->route()->getActionMethod()) {
            'store' => ['service_id' => ['required', new NotBoolean, 'integer', 'min:1'],
                'period' => [...$date, 'ends_with:-01'], 'reading_date' => $date,
                'current_reading' => ['required', 'string', 'regex:/^\d{1,8}(?:\.\d{1,2})?$/D'],
                'photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:5120']],
            'index' => ['status' => ['sometimes', Rule::enum(MeterReadingSubmissionStatus::class)],
                'period' => ['sometimes', ...array_slice($date, 1), 'ends_with:-01'],
                'page' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:2147483647'],
                'room_id' => [$this->user()->hasRole(UserRole::Admin) ? 'sometimes' : 'missing', new NotBoolean, 'integer', 'min:1']],
            'reject' => ['rejection_reason' => ['required', 'string', 'min:1', 'max:2000']],
            default => [],
        };
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => ':attribute là bắt buộc.', 'string' => ':attribute phải là chuỗi.',
            'integer' => ':attribute phải là số nguyên.', 'min' => ':attribute chưa hợp lệ.',
            'max' => ':attribute vượt giới hạn :max.', 'missing' => 'Không được gửi trường :attribute.',
            'regex' => 'Chỉ số phải từ 0 đến 99999999.99, tối đa hai số thập phân.',
            'date_format' => ':attribute phải đúng định dạng năm-tháng-ngày.', 'ends_with' => 'Kỳ tiêu thụ phải là ngày 01.',
            'after_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.', 'before_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.',
            'mimes' => 'Ảnh phải có nội dung JPG, PNG hoặc WebP.', 'extensions' => 'Đuôi ảnh phải là JPG, PNG hoặc WebP.',
            'file' => 'Ảnh phải là tệp tải lên.', 'photo.max' => 'Ảnh không được lớn hơn 5 MB.', 'enum' => 'Trạng thái không hợp lệ.'];
    }

    public function attributes(): array
    {
        return ['service_id' => 'Dịch vụ', 'period' => 'Kỳ tiêu thụ', 'reading_date' => 'Ngày đo',
            'current_reading' => 'Chỉ số mới', 'photo' => 'Ảnh chỉ số', 'rejection_reason' => 'Lý do từ chối'];
    }
}
