<?php

namespace App\Http\Requests\Room;

use App\Models\Room;
use App\Rules\NotBoolean;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class IndexPublicRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewPublicAny', Room::class);
    }

    public function rules(): array
    {
        $rules = [
            'q' => ['nullable', 'string', 'max:191'],
            'building_id' => ['sometimes', new NotBoolean, 'integer', 'min:1'],
            'min_price' => ['sometimes', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991'],
            'max_price' => ['sometimes', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991'],
            'min_area' => ['sometimes', new NotBoolean, 'numeric', 'min:0', 'max:999999.99', 'decimal:0,2'],
            'max_area' => ['sometimes', new NotBoolean, 'numeric', 'min:0', 'max:999999.99', 'decimal:0,2'],
            'min_occupants' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:65535'],
            'max_occupants' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:65535'],
            'amenity_ids' => ['sometimes', 'array', 'list'],
            'amenity_ids.*' => ['required', new NotBoolean, 'integer', 'min:1', 'distinct'],
            'sort' => ['sometimes', Rule::in(['price_asc', 'price_desc', 'area_asc', 'area_desc'])],
            // Giới hạn kỹ thuật để offset phân trang không tràn số nguyên.
            'page' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:2147483647'],
        ];

        foreach (['price', 'area', 'occupants'] as $field) {
            if ($this->query->has('min_'.$field)) {
                $rules['max_'.$field][] = 'gte:min_'.$field;
            }
        }

        return $rules;
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->query()), array_keys($this->rules())) as $field) {
                $validator->errors()->add($field, 'Tham số lọc không được hỗ trợ.');
            }
        }];
    }

    public function messages(): array
    {
        return [
            'integer' => ':attribute phải là số nguyên.',
            'numeric' => ':attribute phải là số.',
            'min' => ':attribute phải từ :min trở lên.',
            'max' => ':attribute không được vượt quá :max.',
            'gte' => ':attribute phải lớn hơn hoặc bằng giới hạn nhỏ nhất.',
            'decimal' => ':attribute có tối đa 2 chữ số thập phân.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'array' => ':attribute phải là danh sách.',
            'list' => ':attribute phải là danh sách liên tiếp từ vị trí 0.',
            'distinct' => 'Không chọn trùng tiện nghi.',
            'required' => ':attribute không được để trống.',
            'sort.in' => 'Cách sắp xếp không hợp lệ.',
        ];
    }

    public function attributes(): array
    {
        return [
            'q' => 'Từ khóa', 'building_id' => 'Tòa nhà', 'page' => 'Trang',
            'min_price' => 'Giá thấp nhất', 'max_price' => 'Giá cao nhất',
            'min_area' => 'Diện tích nhỏ nhất', 'max_area' => 'Diện tích lớn nhất',
            'min_occupants' => 'Sức chứa nhỏ nhất', 'max_occupants' => 'Sức chứa lớn nhất',
            'amenity_ids' => 'Tiện nghi', 'amenity_ids.*' => 'Tiện nghi',
        ];
    }
}
