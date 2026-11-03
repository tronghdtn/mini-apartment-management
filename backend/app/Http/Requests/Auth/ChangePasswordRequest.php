<?php

namespace App\Http\Requests\Auth;

use App\Support\PasswordRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isActive() === true;
    }

    public function rules(): array
    {
        return ['current_password' => PasswordRules::login(), 'password' => PasswordRules::registration(),
            'password_confirmation' => ['required', 'string']];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            foreach (array_diff(array_keys($this->all()), ['current_password', 'password', 'password_confirmation']) as $field) {
                $validator->errors()->add($field, 'Không được gửi thêm trường ngoài thông tin mật khẩu.');
            }
        }];
    }

    public function messages(): array
    {
        return ['required' => ':attribute là bắt buộc.', 'string' => ':attribute phải là chuỗi ký tự.',
            'password.min' => 'Mật khẩu mới phải có ít nhất :min ký tự.', 'password.confirmed' => 'Mật khẩu nhập lại không khớp.'];
    }

    public function attributes(): array
    {
        return ['current_password' => 'Mật khẩu hiện tại', 'password' => 'Mật khẩu mới', 'password_confirmation' => 'Xác nhận mật khẩu mới'];
    }
}
