<?php

namespace App\Http\Requests\Amenity;

use App\Models\Amenity;
use App\Rules\MaxTextBytes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreAmenityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', Amenity::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120', Rule::unique(Amenity::class, 'name')],
            'description' => ['nullable', 'string', new MaxTextBytes],
            'id' => ['missing'],
            'category' => ['missing'],
            'status' => ['missing'],
            'price' => ['missing'],
            'billing_type' => ['missing'],
            'amenity_ids' => ['missing'],
            'building_ids' => ['missing'],
            'room_ids' => ['missing'],
            'deleted_at' => ['missing'],
            'created_at' => ['missing'],
            'updated_at' => ['missing'],
        ];
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute không được vượt quá :max ký tự.',
            'name.unique' => 'Tên tiện nghi đã được sử dụng, kể cả tiện nghi đã lưu trữ.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return ['name' => 'Tên tiện nghi', 'description' => 'Mô tả', 'category' => 'Nhóm tiện nghi', 'status' => 'Trạng thái'];
    }
}
