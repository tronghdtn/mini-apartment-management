<?php

namespace App\Support;

use Illuminate\Console\OutputStyle;
use Symfony\Component\Console\Question\Question;

class HiddenPasswordInput
{
    public static function ask(OutputStyle $output, string $label): ?string
    {
        $question = new Question($label);
        $question->setHidden(true)->setHiddenFallback(false)->setTrimmable(false);
        $value = $output->askQuestion($question);

        // Symfony giữ dấu Enter khi trimmable=false. Chỉ bỏ MỘT dấu kết thúc dòng,
        // giữ nguyên khoảng trắng và mọi ký tự người vận hành thực sự nhập.
        return is_string($value) ? preg_replace('/(?:\r\n|\n|\r)\z/', '', $value) : $value;
    }
}
