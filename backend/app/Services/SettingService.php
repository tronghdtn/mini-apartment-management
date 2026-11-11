<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class SettingService
{
    public const WRITABLE_SYSTEM_KEYS = ['system.name', 'system.contact_phone', 'system.contact_email'];

    /** DB-D94: thông tin nhận chuyển khoản; chỉ hướng dẫn, không kết nối ngân hàng/cổng thanh toán. */
    public const WRITABLE_BANK_KEYS = ['bank.name', 'bank.account_number', 'bank.account_holder'];

    /** Khóa văn bản ghi theo giá trị đã đọc (CAS): thông tin hệ thống (DB-D89) và ngân hàng (DB-D94). */
    public const WRITABLE_TEXT_KEYS = [...self::WRITABLE_SYSTEM_KEYS, ...self::WRITABLE_BANK_KEYS];

    public function updateText(string $key, ?string $value, ?string $expectedValue): Setting
    {
        abort_unless(in_array($key, self::WRITABLE_TEXT_KEYS, true), 404);
        $group = self::DEFAULT_SETTINGS[$key]['group'];

        try {
            return DB::transaction(function () use ($key, $value, $expectedValue, $group): Setting {
                $setting = Setting::where('key', $key)->lockForUpdate()->first();
                abort_unless($setting?->value === $expectedValue, 409, 'Cấu hình đã thay đổi. Vui lòng tải lại trước khi lưu.');
                if ($setting) {
                    abort_unless($setting->type->value === 'string' && $setting->group === $group, 409, 'Kiểu cấu hình không phù hợp. Vui lòng kiểm tra lại cấu hình hệ thống.');
                }
                $setting ??= new Setting(['key' => $key, 'type' => 'string', 'group' => $group]);
                $setting->value = $value;
                $setting->save();

                return $setting->refresh();
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Cấu hình vừa được tạo bởi thao tác khác. Vui lòng tải lại trước khi lưu.');
        }
    }

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

    /** @return array{name: ?string, account_number: ?string, account_holder: ?string} Chuỗi rỗng cũ được coi như chưa cấu hình. */
    public function bankDetails(): array
    {
        $stored = Setting::query()->whereIn('key', self::WRITABLE_BANK_KEYS)->pluck('value', 'key');
        $read = fn (string $key) => is_string($stored[$key] ?? null) && trim($stored[$key]) !== '' ? $stored[$key] : null;

        return ['name' => $read('bank.name'), 'account_number' => $read('bank.account_number'), 'account_holder' => $read('bank.account_holder')];
    }

    /**
     * Thông tin liên hệ hiện trên trang công khai. Chỉ gồm 3 khóa system.*; không bao giờ có khóa bank.*.
     *
     * @return array{system_name: ?string, contact_phone: ?string, contact_email: ?string} Chuỗi rỗng được coi như chưa cấu hình.
     */
    public function publicContact(): array
    {
        $stored = Setting::query()->whereIn('key', self::WRITABLE_SYSTEM_KEYS)->pluck('value', 'key');
        $read = fn (string $key) => is_string($stored[$key] ?? null) && trim($stored[$key]) !== '' ? trim($stored[$key]) : null;

        return [
            'system_name' => $read('system.name'),
            'contact_phone' => $read('system.contact_phone'),
            'contact_email' => $read('system.contact_email'),
        ];
    }

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
