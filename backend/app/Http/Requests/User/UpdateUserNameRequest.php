<?php

namespace App\Http\Requests\User;

use App\Models\User;
use App\Services\AdminUserService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateUserNameRequest extends FormRequest
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
        $rules = ['full_name' => ['required', 'string', 'max:120']];
        foreach (['id', 'user_id', 'status', 'phone', 'email', 'password', 'password_confirmation', 'role', 'email_verified_at', 'remember_token', 'id_number', 'date_of_birth', 'gender', 'permanent_address', 'has_active_contract', 'active_contract', 'created_at', 'updated_at', 'permissions', 'is_admin'] as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'Vui lòng nhập họ tên.',
            'full_name.string' => 'Họ tên phải là chuỗi ký tự.',
            'full_name.max' => 'Họ tên không được vượt quá 120 ký tự.',
            'missing' => 'Không được gửi trường :attribute khi sửa họ tên.',
        ];
    }
}
