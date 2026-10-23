<?php

namespace App\Support;

class AuthIdentity
{
    public static function email(mixed $value): mixed
    {
        return is_string($value) ? mb_strtolower(trim($value)) : $value;
    }

    public static function phone(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $value = trim($value);

        return preg_replace('/\A\+?84([1-9][0-9]{8,9})\z/', '0$1', $value);
    }

    public static function identifier(mixed $value): mixed
    {
        return is_string($value) && str_contains($value, '@')
            ? self::email($value)
            : self::phone($value);
    }

    /** Dùng để đọc tài khoản cũ, không tự ghi lại dữ liệu. @return list<string> */
    public static function phoneVariants(string $phone): array
    {
        $phone = self::phone($phone);

        return preg_match('/\A0[1-9][0-9]{8,9}\z/', $phone)
            ? [$phone, '84'.substr($phone, 1), '+84'.substr($phone, 1)]
            : [$phone];
    }
}
