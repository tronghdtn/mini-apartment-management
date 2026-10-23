<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Laravel integer có thể nhận true thành 1; không cho phép ép boolean thành số tiền. */
class NotBoolean implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_bool($value)) {
            $fail('Giá trị phải là số nguyên, không được dùng giá trị đúng hoặc sai.');
        }
    }
}
