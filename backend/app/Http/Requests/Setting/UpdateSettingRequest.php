<?php

namespace App\Http\Requests\Setting;

use App\Services\SettingService;
use Illuminate\Validation\Validator;

class UpdateSettingRequest extends UpdateDaysSettingRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->isSystemKey()) {
            return;
        }
        // expected_value must keep the exact GET value, including legacy spaces/empty strings.
        // Global TrimStrings/ConvertEmptyStringsToNull have already processed normal inputs.
        $raw = $this->isJson() ? json_decode($this->getContent(), true) : null;
        if (is_array($raw) && array_key_exists('expected_value', $raw)) {
            $this->merge(['expected_value' => $raw['expected_value']]);
        }
        if (is_string($this->input('value'))) {
            $value = trim($this->input('value'));
            $this->merge(['value' => $value === '' ? null : $value]);
        }
    }

    public function rules(): array
    {
        if (! $this->isSystemKey()) {
            return parent::rules();
        }
        $value = ['present', 'nullable', 'string', 'max:'.($this->route('key') === 'system.contact_phone' ? 30 : 191)];
        if ($this->route('key') === 'system.contact_email') {
            $value[] = 'email:rfc';
        }

        return ['value' => $value, 'expected_value' => ['present', 'nullable', 'string']];
    }

    public function after(): array
    {
        if (! $this->isSystemKey()) {
            return [];
        }

        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['value', 'expected_value']) as $field) {
                $validator->errors()->add($field, 'Không được gửi trường ngoài giá trị cấu hình và giá trị đã đọc.');
            }
        }];
    }

    public function messages(): array
    {
        return parent::messages() + ['present' => 'Thiếu trường :attribute.', 'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute tối đa :max ký tự.', 'email' => 'Email liên hệ không đúng định dạng.'];
    }

    private function isSystemKey(): bool
    {
        return in_array($this->route('key'), SettingService::WRITABLE_SYSTEM_KEYS, true);
    }
}
