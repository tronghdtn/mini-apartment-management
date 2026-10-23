<?php

namespace App\Support;

use Closure;
use Illuminate\Validation\Rules\Password;

class PasswordRules
{
    public static function registration(): array
    {
        return [
            'bail', 'required', 'string', Password::defaults(), 'confirmed', self::safeLength(),
        ];
    }

    public static function login(): array
    {
        return ['bail', 'required', 'string', 'max:4096', self::safeLength()];
    }

    private static function safeLength(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (str_contains($value, "\0")) {
                $fail('Mật khẩu không được chứa ký tự NUL.');
            }
            if (config('hashing.driver') === 'bcrypt' && strlen($value) > 72) {
                $fail('Mật khẩu không được vượt quá 72 byte khi sử dụng bcrypt.');
            }
        };
    }
}
