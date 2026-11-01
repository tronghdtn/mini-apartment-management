<?php

namespace App\Http\Requests\Room;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

class RoomPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', $this->route('room'));
    }

    public function rules(): array
    {
        $rules = match ($this->route()->getActionMethod()) {
            'store' => ['photos' => ['required', 'array', 'min:1', 'max:20'],
                'photos.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']],
            'cover' => ['expected_cover_id' => ['present', 'nullable', 'integer', 'min:1']],
            default => [],
        };
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $bytes = 0;
            foreach (Arr::flatten($this->allFiles()) as $file) {
                if ($file->isValid()) {
                    $bytes += $file->getSize();
                }
            }
            if ($bytes > 30 * 1024 * 1024) {
                $validator->errors()->add('photos', 'Tổng ảnh mỗi lần gửi không được vượt 30 MiB.');
            }
        }];
    }

    public function messages(): array
    {
        return ['required' => 'Vui lòng chọn :attribute.', 'present' => 'Cần gửi thông tin bìa hiện tại.',
            'array' => ':attribute phải là danh sách ảnh.', 'max' => ':attribute vượt giới hạn cho phép (20 ảnh, 5 MiB/ảnh).',
            'image' => 'Tệp phải là ảnh hợp lệ.', 'mimes' => 'Chỉ nhận ảnh JPG, PNG hoặc WebP.',
            'file' => 'Tệp ảnh không hợp lệ.', 'missing' => 'Không được gửi trường :attribute.',
            'integer' => 'Mã ảnh bìa phải là số nguyên.', 'min' => 'Giá trị :attribute không hợp lệ.'];
    }

    public function attributes(): array
    {
        return ['photos' => 'ảnh phòng', 'photos.*' => 'ảnh phòng', 'expected_cover_id' => 'ảnh bìa hiện tại'];
    }
}
