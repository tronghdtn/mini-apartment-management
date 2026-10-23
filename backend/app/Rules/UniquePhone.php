<?php

namespace App\Rules;

use App\Models\User;
use App\Support\AuthIdentity;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class UniquePhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && User::whereIn('phone', AuthIdentity::phoneVariants($value))->exists()) {
            $fail('Số điện thoại đã được sử dụng.');
        }
    }
}
