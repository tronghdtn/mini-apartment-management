<?php

namespace App\Http\Requests\User;

use App\Enums\UserStatus;
use App\Models\User;
use App\Services\AdminUserService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateUserStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewAny', User::class)) {
            return false;
        }
        app(AdminUserService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        $rules = ['status' => ['bail', 'required', 'string', Rule::enum(UserStatus::class)]];
        foreach (['id', 'user_id', 'full_name', 'phone', 'email', 'password', 'password_confirmation', 'role', 'email_verified_at', 'remember_token', 'id_number', 'date_of_birth', 'gender', 'permanent_address', 'has_active_contract', 'active_contract', 'created_at', 'updated_at', 'permissions', 'is_admin'] as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'status.required' => 'Vui lòng chọn trạng thái tài khoản.',
            'status.string' => 'Trạng thái tài khoản không hợp lệ.',
            'status.enum' => 'Trạng thái tài khoản phải là hoạt động hoặc bị khóa.',
            'missing' => 'Không được gửi trường :attribute trong thao tác khóa/mở khóa.',
        ];
    }
}
