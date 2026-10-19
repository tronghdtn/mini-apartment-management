<?php

namespace App\Enums;

/** Kiểu giá trị cấu hình — settings.type. */
enum SettingType: string
{
    case String = 'string';
    case Integer = 'integer';
    case Boolean = 'boolean';
    case Json = 'json';
}
