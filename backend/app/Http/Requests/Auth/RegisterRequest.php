<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Rules\UniquePhone;
use App\Support\AuthIdentity;
use App\Support\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
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
            'password' => PasswordRules::registration(),
            'role' => ['missing'],
            'status' => ['missing'],
        ];
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute không được vượt quá :max ký tự.',
            'email.email' => 'Email không đúng định dạng.',
            'email.unique' => 'Email đã được sử dụng.',
            'phone.regex' => 'Số điện thoại phải gồm 10–15 chữ số, có thể bắt đầu bằng dấu +.',
            'password.min' => 'Mật khẩu phải có ít nhất :min ký tự.',
            'password.confirmed' => 'Mật khẩu nhập lại không khớp.',
            'role.missing' => 'Không được tự chọn vai trò tài khoản.',
            'status.missing' => 'Không được tự chọn trạng thái tài khoản.',
        ];
    }

    public function attributes(): array
    {
        return ['full_name' => 'Họ và tên', 'phone' => 'Số điện thoại', 'email' => 'Email', 'password' => 'Mật khẩu'];
    }
}
