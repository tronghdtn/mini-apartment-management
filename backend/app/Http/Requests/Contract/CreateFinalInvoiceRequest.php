<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use App\Rules\MaxTextBytes;
use App\Rules\NotBoolean;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

class CreateFinalInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Contract::class);
    }

    public function rules(): array
    {
        $rules = [
            'actual_end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:1000-01-01', 'before_or_equal:9999-12-31'],
            'closure_note' => ['nullable', 'string', new MaxTextBytes],
            'expected_revision' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'],
            'electricity_reading' => ['required', 'string', new NotBoolean, 'regex:/^\d{1,8}(?:\.\d{1,2})?$/D'],
            'water_reading' => ['required', 'string', new NotBoolean, 'regex:/^\d{1,8}(?:\.\d{1,2})?$/D'],
            'damages' => ['sometimes', 'array', 'list', 'min:1', 'max:10'],
            'damages.*' => ['array:description,reason,basis,amount'],
            'damages.*.description' => ['required_with:damages', 'string', 'max:255'],
            'damages.*.reason' => ['required_with:damages', 'string', 'max:2000'],
            'damages.*.basis' => ['required_with:damages', 'string', 'max:2000'],
            'damages.*.amount' => ['required_with:damages', new NotBoolean, 'integer', 'min:1', 'max:9007199254740991'],
            'damage_photos' => ['sometimes', 'array', 'max:10'],
            'damage_photos.*' => ['array', 'list', 'min:1', 'max:5'],
            'damage_photos.*.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'waiver_code' => ['sometimes', 'string', 'max:50'],
            'waiver_note' => ['required_with:waiver_code', 'string', 'max:2000'],
            'waiver_evidence' => ['required_with:waiver_code', 'array', 'list', 'min:1', 'max:5'],
            'waiver_evidence.*' => ['required_with:waiver_code', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            // Cộng chung ảnh mọi hạng mục và ảnh miễn phí, không cắt bỏ phần dư.
            $photos = Arr::flatten($this->allFiles());
            $bytes = 0;
            foreach ($photos as $photo) {
                if ($photo->isValid()) {
                    $bytes += $photo->getSize();
                }
            }
            if (count($photos) > 20) {
                $validator->errors()->add('damage_photos', 'Mỗi lần gửi tối đa 20 ảnh, gồm cả ảnh căn cứ miễn phí.');
            }
            if ($bytes > 30 * 1024 * 1024) {
                $validator->errors()->add('damage_photos', 'Tổng dung lượng ảnh mỗi lần gửi không được vượt quá 30 MB.');
            }
        }];
    }

    public function messages(): array
    {
        return ['required' => 'Vui lòng nhập :attribute.', 'required_with' => 'Vui lòng nhập :attribute.',
            'date_format' => ':attribute phải là ngày tồn tại theo YYYY-MM-DD.', 'after_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.',
            'before_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.', 'string' => ':attribute phải là chuỗi.',
            'integer' => ':attribute phải là số nguyên VND.', 'min' => ':attribute không được để trống hoặc bằng 0.',
            'max' => ':attribute vượt giới hạn hoặc số lượng ảnh vượt quá 5.', 'regex' => ':attribute không đúng định dạng.',
            'mimes' => 'Ảnh phải có định dạng JPG, PNG hoặc WebP.', 'file' => 'Tệp tải lên không hợp lệ.',
            'array' => ':attribute phải là danh sách hợp lệ.', 'missing' => 'Không được gửi trường :attribute.',
            'list' => ':attribute phải là danh sách có thứ tự liên tiếp.',
            'damage_photos.*' => 'Mỗi hạng mục phải có ít nhất một ảnh căn cứ riêng tư.'];
    }

    public function attributes(): array
    {
        return ['actual_end_date' => 'ngày bàn giao', 'closure_note' => 'ghi chú bàn giao', 'expected_revision' => 'phiên bản hợp đồng',
            'electricity_reading' => 'chỉ số điện cuối', 'water_reading' => 'chỉ số nước cuối', 'damages' => 'hạng mục bồi thường',
            'damage_photos' => 'ảnh căn cứ bồi thường',
            'waiver_code' => 'điều kiện miễn phí', 'waiver_note' => 'căn cứ miễn phí', 'waiver_evidence' => 'ảnh căn cứ miễn phí'];
    }
}
