<?php

namespace App\Http\Requests\Building;

use App\Models\Building;
use App\Rules\MaxTextBytes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreBuildingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', Building::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150', Rule::unique(Building::class, 'name')],
            'address' => ['required', 'string', 'max:500'],
            'total_floors' => ['required', 'integer', 'between:1,65535'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'description' => ['nullable', 'string', new MaxTextBytes],
            'id' => ['missing'],
            'status' => ['missing'],
            'category' => ['missing'],
            'price' => ['missing'],
            'amenity_ids' => ['missing'],
            'amenities' => ['missing'],
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
            'integer' => ':attribute phải là số nguyên.',
            'numeric' => ':attribute phải là số.',
            'between' => ':attribute phải nằm trong khoảng :min đến :max.',
            'name.unique' => 'Tên tòa nhà đã được sử dụng.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'Tên tòa nhà',
            'address' => 'Địa chỉ',
            'total_floors' => 'Số tầng',
            'latitude' => 'Vĩ độ',
            'longitude' => 'Kinh độ',
            'description' => 'Mô tả',
            'status' => 'Trạng thái',
        ];
    }
}
