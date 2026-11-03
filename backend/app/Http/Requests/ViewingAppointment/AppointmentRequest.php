<?php

namespace App\Http\Requests\ViewingAppointment;

use App\Enums\AppointmentStatus;
use App\Enums\UserRole;
use App\Models\ViewingAppointment;
use App\Rules\NotBoolean;
use App\Services\ViewingAppointmentService;
use App\Support\AuthIdentity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AppointmentRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->route()->getActionMethod() === 'store') {
            $this->merge(['guest_phone' => AuthIdentity::phone($this->input('guest_phone'))]);
        }
    }

    public function authorize(): bool
    {
        $action = $this->route()->getActionMethod();
        if ($action !== 'store' && ! Gate::allows('viewAny', ViewingAppointment::class)) {
            return false;
        }
        if ($action === 'store' && $this->user() !== null && ! $this->user()->isActive()) {
            return false;
        }
        if (in_array($action, ['confirm', 'reschedule', 'complete'], true) && ! Gate::allows('manage', ViewingAppointment::class)) {
            return false;
        }
        app(ViewingAppointmentService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        $time = ['required', 'string', 'date_format:Y-m-d\TH:i:sP'];
        $rules = match ($this->route()->getActionMethod()) {
            'index' => ['status' => ['sometimes', Rule::enum(AppointmentStatus::class)],
                'date' => ['sometimes', 'date_format:Y-m-d'],
                'page' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:2147483647']],
            'store' => ['room_id' => ['required', new NotBoolean, 'integer', 'min:1'],
                'guest_name' => ['required', 'string', 'max:120'],
                'guest_phone' => ['required', 'string', 'max:20', 'regex:/\A\+?[0-9]{10,15}\z/'],
                'preferred_at' => $time, 'website' => ['nullable', 'string', 'max:0']],
            'reschedule' => ['preferred_at' => $time, 'admin_note' => ['required', 'string', 'max:2000']],
            'confirm', 'complete' => ['admin_note' => ['nullable', 'string', 'max:2000']],
            'checkIn', 'checkOut' => ['guard_note' => ['nullable', 'string', 'max:2000']],
            default => [],
        };
        if ($this->route()->getActionMethod() === 'index' && $this->user()?->role === UserRole::Admin) {
            $rules['room_id'] = ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:9007199254740991'];
        }
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => ':attribute là bắt buộc.', 'string' => ':attribute phải là văn bản.',
            'date_format' => ':attribute không đúng định dạng.', 'regex' => 'Số điện thoại phải gồm 10–15 chữ số, có thể bắt đầu bằng dấu +.',
            'max' => ':attribute vượt giới hạn cho phép.', 'min' => ':attribute ngoài phạm vi cho phép.',
            'integer' => ':attribute phải là số nguyên.', 'enum' => 'Trạng thái không hợp lệ.',
            'missing' => 'Không được gửi trường :attribute.'];
    }

    public function attributes(): array
    {
        return ['guest_name' => 'Tên người xem phòng', 'guest_phone' => 'Số điện thoại', 'preferred_at' => 'Thời gian hẹn',
            'room_id' => 'Phòng', 'admin_note' => 'Ghi chú quản trị', 'guard_note' => 'Ghi chú đón khách', 'website' => 'Trường chống spam'];
    }
}
