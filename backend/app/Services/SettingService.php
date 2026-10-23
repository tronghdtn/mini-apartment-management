<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class SettingService
{
    public const WRITABLE_DAY_KEYS = ['invoice.due_days', 'contract.expiring_warning_days'];

    public const DEFAULT_SETTINGS = [
        'system.name' => ['value' => null, 'type' => 'string', 'group' => 'system'],
        'system.contact_phone' => ['value' => null, 'type' => 'string', 'group' => 'system'],
        'system.contact_email' => ['value' => null, 'type' => 'string', 'group' => 'system'],
        'bank.name' => ['value' => null, 'type' => 'string', 'group' => 'bank'],
        'bank.account_number' => ['value' => null, 'type' => 'string', 'group' => 'bank'],
        'bank.account_holder' => ['value' => null, 'type' => 'string', 'group' => 'bank'],
        'invoice.due_days' => ['value' => '5', 'type' => 'integer', 'group' => 'invoice'],
        'contract.expiring_warning_days' => ['value' => '30', 'type' => 'integer', 'group' => 'contract'],
    ];

    /** @return Collection<int, Setting> */
    public function all(): Collection
    {
        return Setting::query()->whereIn('key', array_keys(self::DEFAULT_SETTINGS))->orderBy('key')->get();
    }

    public function updateDays(string $key, int $value): Setting
    {
        abort_unless(in_array($key, self::WRITABLE_DAY_KEYS, true), 404);

        try {
            return DB::transaction(function () use ($key, $value): Setting {
                $setting = Setting::query()->where('key', $key)->lockForUpdate()->first();
                $setting ??= new Setting(['key' => $key, 'type' => 'integer', 'group' => self::DEFAULT_SETTINGS[$key]['group']]);
                $setting->value = (string) $value;
                $setting->save();

                return $setting->refresh();
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Cấu hình vừa được tạo bởi thao tác khác. Vui lòng tải lại trước khi lưu.');
        }
    }
}
