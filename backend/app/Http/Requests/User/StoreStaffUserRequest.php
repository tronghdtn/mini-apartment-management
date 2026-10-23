<?php

namespace App\Http\Requests\User;

use App\Enums\UserRole;
use App\Models\User;
use App\Rules\UniquePhone;
use App\Services\AdminUserService;
use App\Support\AuthIdentity;
use App\Support\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreStaffUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('createStaff', User::class)) {
            return false;
        }

        app(AdminUserService::class)->ensureReady();

        return true;
    }

    protected function prepareForValidation(): void
    {
        $email = AuthIdentity::email($this->input('email'));
        $this->merge([
            'email' => $email === '' ? null : $email,
            'phone' => AuthIdentity::phone($this->input('phone')),
        ]);
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:120'],
            'phone' => ['bail', 'required', 'string', 'max:20', 'regex:/\A\+?[0-9]{10,15}\z/', new UniquePhone],
            'email' => ['bail', 'nullable', 'string', 'email:rfc', 'max:191', Rule::unique(User::class, 'email')],
            'role' => ['required', Rule::in([UserRole::Technician->value, UserRole::Guard->value])],
            'password' => PasswordRules::registration(),
            'status' => ['missing'],
            'id' => ['missing'],
            'user_id' => ['missing'],
            'email_verified_at' => ['missing'],
            'remember_token' => ['missing'],
            'id_number' => ['missing'],
            'date_of_birth' => ['missing'],
            'gender' => ['missing'],
            'permanent_address' => ['missing'],
            'has_active_contract' => ['missing'],
            'active_contract' => ['missing'],
            'created_at' => ['missing'],
            'updated_at' => ['missing'],
            'permissions' => ['missing'],
            'is_admin' => ['missing'],
        ];
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute không được vượt quá :max ký tự.',
            'email.email' => 'Email không đúng định dạng.',
            'email.unique' => 'Email đã được sử dụng. Không thay đổi tài khoản hiện có.',
            'phone.regex' => 'Số điện thoại phải gồm 10–15 chữ số, có thể bắt đầu bằng dấu +.',
            'role.in' => 'Chỉ được cấp tài khoản Kỹ thuật viên hoặc Bảo vệ.',
            'password.min' => 'Mật khẩu phải có ít nhất :min ký tự.',
            'password.confirmed' => 'Mật khẩu nhập lại không khớp.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return [
            'full_name' => 'Họ và tên',
            'phone' => 'Số điện thoại',
            'email' => 'Email',
            'role' => 'Vai trò',
            'password' => 'Mật khẩu',
        ];
    }
}
