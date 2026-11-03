<?php

namespace App\Http\Requests\Setting;

use App\Services\SettingService;
use Illuminate\Validation\Validator;

class UpdateSettingRequest extends UpdateDaysSettingRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->isTextKey()) {
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
        if (! $this->isTextKey()) {
            return parent::rules();
        }
        $key = $this->route('key');
        $max = match ($key) {
            'system.contact_phone' => 30,
            'bank.name', 'bank.account_holder' => 100,
            'bank.account_number' => 20,
            default => 191,
        };
        $value = ['present', 'nullable', 'string', 'max:'.$max];
        if ($key === 'system.contact_email') {
            $value[] = 'email:rfc';
        }
        if ($key === 'bank.account_number') {
            // DB-D94: chỉ chữ số, 6–20 ký tự, không khoảng trắng/dấu.
            $value[] = 'regex:/^[0-9]{6,20}$/D';
        }

        return ['value' => $value, 'expected_value' => ['present', 'nullable', 'string']];
    }

    public function after(): array
    {
        if (! $this->isTextKey()) {
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
            'max' => ':attribute tối đa :max ký tự.', 'email' => 'Email liên hệ không đúng định dạng.',
            'regex' => 'Số tài khoản chỉ gồm chữ số, từ 6 đến 20 ký tự.'];
    }

    private function isTextKey(): bool
    {
        return in_array($this->route('key'), SettingService::WRITABLE_TEXT_KEYS, true);
    }
}
