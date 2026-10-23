<?php

namespace App\Http\Requests\Auth;

use App\Support\AuthIdentity;
use App\Support\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['identifier' => AuthIdentity::identifier($this->input('identifier'))]);
    }

    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:191'],
            // Không áp chính sách tạo mật khẩu lên tài khoản cũ khi đăng nhập.
            'password' => PasswordRules::login(),
        ];
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute không được vượt quá :max ký tự.',
        ];
    }

    public function attributes(): array
    {
        return ['identifier' => 'Email hoặc số điện thoại', 'password' => 'Mật khẩu'];
    }
}
