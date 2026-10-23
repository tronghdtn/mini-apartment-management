<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Giới hạn dung lượng cột MySQL TEXT, đo byte thay vì số ký tự UTF-8. */
class MaxTextBytes implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && strlen($value) > 65535) {
            $fail('Mô tả quá dài. Vui lòng rút gọn nội dung.');
        }
    }
}
