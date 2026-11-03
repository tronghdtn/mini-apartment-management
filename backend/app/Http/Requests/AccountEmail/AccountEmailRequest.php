<?php

namespace App\Http\Requests\AccountEmail;

use App\Support\AuthIdentity;
use App\Support\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;

/** Một FormRequest cho các thao tác email tài khoản (DB-D95); luật theo action, mọi trường lạ bị từ chối. */
class AccountEmailRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Hai thao tác cần đăng nhập đã qua middleware auth:sanctum + active; các thao tác bằng liên kết là công khai.
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => AuthIdentity::email($this->input('email'))]);
        }
    }

    public function rules(): array
    {
        $email = ['bail', 'required', 'string', 'max:191', 'email:rfc'];
        $rules = match ($this->route()->getActionMethod()) {
            'forgotPassword' => ['email' => $email],
            'resetPassword' => ['email' => $email, 'token' => ['bail', 'required', 'string', 'max:255'],
                'password' => PasswordRules::registration(), 'password_confirmation' => ['required', 'string']],
            'verify' => ['id' => ['bail', 'required', 'integer', 'min:1', 'max:9007199254740991'],
                'hash' => ['bail', 'required', 'string', 'regex:/^[a-f0-9]{40}$/D'],
                'expires' => ['bail', 'required', 'integer', 'min:1', 'max:9999999999'],
                'signature' => ['bail', 'required', 'string', 'regex:/^[a-f0-9]{64}$/D']],
            'requestChange' => ['email' => $email, 'current_password' => PasswordRules::login()],
            'confirmChange' => ['token' => ['bail', 'required', 'string', 'max:4096']],
            default => [],
        };
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => ':attribute là bắt buộc.', 'string' => ':attribute phải là chuỗi ký tự.', 'max' => ':attribute quá dài.',
            'email' => 'Email không đúng định dạng.', 'integer' => 'Liên kết không hợp lệ.', 'min' => 'Liên kết không hợp lệ.',
            'regex' => 'Liên kết không hợp lệ.', 'missing' => 'Không được gửi trường :attribute.',
            'password.min' => 'Mật khẩu mới phải có ít nhất :min ký tự.', 'password.confirmed' => 'Mật khẩu nhập lại không khớp.'];
    }

    public function attributes(): array
    {
        return ['email' => 'Email', 'token' => 'Mã liên kết', 'password' => 'Mật khẩu mới', 'password_confirmation' => 'Xác nhận mật khẩu mới',
            'current_password' => 'Mật khẩu hiện tại', 'id' => 'Mã tài khoản', 'hash' => 'Mã xác minh', 'expires' => 'Hạn liên kết',
            'signature' => 'Chữ ký liên kết'];
    }
}
