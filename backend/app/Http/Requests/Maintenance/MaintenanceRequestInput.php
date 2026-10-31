<?php

namespace App\Http\Requests\Maintenance;

use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceRequestStatus;
use App\Models\MaintenanceRequest;
use App\Rules\MaxTextBytes;
use App\Rules\NotBoolean;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class MaintenanceRequestInput extends FormRequest
{
    public function authorize(): bool
    {
        $record = $this->route('maintenanceRequest');
        $ability = match ($this->route()->getActionMethod()) {
            'context', 'store' => 'create',
            'index' => 'viewAny',
            'show', 'photo' => 'view',
            'update' => 'update',
            'assign' => 'assign',
            'start' => 'start',
            'resolve' => 'resolve',
            'reject' => 'reject',
            'reopen' => 'reopen',
            default => false,
        };

        return $ability !== false && Gate::allows($ability, $record instanceof MaintenanceRequest ? $record : MaintenanceRequest::class);
    }

    public function rules(): array
    {
        $priority = Rule::enum(MaintenancePriority::class);
        $action = $this->route()->getActionMethod();
        $rules = match ($action) {
            'index' => ['status' => ['sometimes', Rule::enum(MaintenanceRequestStatus::class)], 'priority' => ['sometimes', $priority],
                'room_id' => ['sometimes', 'integer', 'min:1'], 'page' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:2147483647']],
            'store' => ['title' => ['required', 'string', 'max:150'], 'description' => ['required', 'string', new MaxTextBytes],
                'priority' => ['required', $priority], 'photos' => ['sometimes', 'array', 'max:5'],
                'photos.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:5120']],
            'update' => ['priority' => ['sometimes', 'required', $priority], 'admin_note' => ['sometimes', 'nullable', 'string', new MaxTextBytes]],
            'assign' => ['assigned_to' => ['required', 'integer', 'min:1'], 'priority' => ['sometimes', $priority],
                'admin_note' => ['sometimes', 'nullable', 'string', new MaxTextBytes]],
            'resolve' => ['handler_note' => ['required', 'string', new MaxTextBytes]],
            'reject' => ['admin_note' => ['required', 'string', new MaxTextBytes]],
            default => [],
        };
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => 'Vui lòng nhập :attribute.', 'max' => 'Trường :attribute vượt giới hạn cho phép.',
            'mimes' => 'Ảnh phải có định dạng JPG, PNG hoặc WebP.', 'missing' => 'Không được gửi trường :attribute.',
            'enum' => 'Giá trị :attribute không hợp lệ.', 'integer' => 'Trường :attribute phải là số nguyên.'];
    }

    public function after(): array
    {
        if ($this->route()->getActionMethod() !== 'update') {
            return [];
        }

        return [function (Validator $validator): void {
            if (! array_key_exists('priority', $this->all()) && ! array_key_exists('admin_note', $this->all())) {
                $validator->errors()->add('request', 'Cần chọn mức ưu tiên hoặc nhập ghi chú để cập nhật.');
            }
        }];
    }

    public function attributes(): array
    {
        return ['title' => 'tiêu đề', 'description' => 'mô tả', 'priority' => 'mức ưu tiên', 'photos' => 'ảnh',
            'assigned_to' => 'nhân viên được phân công', 'admin_note' => 'ghi chú quản lý', 'handler_note' => 'ghi chú xử lý',
            'room_id' => 'phòng', 'page' => 'trang'];
    }
}
