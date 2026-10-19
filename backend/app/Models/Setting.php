<?php

namespace App\Models;

use App\Enums\SettingType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Cấu hình nghiệp vụ — docs/09_DATABASE_DESIGN.md §3.20. Không lưu secret.
 * Đọc/ghi qua SettingService (cache + invalidation) khi triển khai.
 */
#[Fillable(['key', 'value', 'type', 'group'])]
class Setting extends Model
{
    protected function casts(): array
    {
        return [
            'type' => SettingType::class,
        ];
    }
}
