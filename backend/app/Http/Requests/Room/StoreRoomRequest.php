<?php

namespace App\Http\Requests\Room;

use App\Models\Building;
use App\Models\Room;
use App\Rules\MaxTextBytes;
use App\Rules\NotBoolean;
use App\Services\RoomService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('create', Room::class)) {
            return false;
        }

        app(RoomService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        $buildingId = is_scalar($this->input('building_id'))
            ? filter_var($this->input('building_id'), FILTER_VALIDATE_INT)
            : false;

        return [
            'building_id' => ['bail', 'required', 'integer', 'min:1', Rule::exists(Building::class, 'id')],
            'code' => ['required', 'string', 'max:50', Rule::unique(Room::class, 'code')->where('building_id', $buildingId === false ? 0 : $buildingId)],
            'floor_number' => ['required', 'integer', 'between:1,65535'],
            'area' => ['required', 'numeric', 'gt:0', 'max:999999.99', 'decimal:0,2'],
            // API trả số JSON: từ chối giá trị giao diện không thể biểu diễn chính xác, không làm tròn.
            'base_price' => ['required', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991'],
            'deposit_amount' => ['required', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991'],
            'max_occupants' => ['required', 'integer', 'between:1,65535'],
            'is_public' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', new MaxTextBytes],
            'id' => ['missing'],
            'status' => ['missing'],
            'amenity_ids' => ['missing'],
            'amenities' => ['missing'],
            'photos' => ['missing'],
            'contracts' => ['missing'],
            'contract_id' => ['missing'],
            'created_at' => ['missing'],
            'updated_at' => ['missing'],
        ];
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'integer' => ':attribute phải là số nguyên.',
            'numeric' => ':attribute phải là số.',
            'min' => ':attribute phải từ :min trở lên.',
            'max' => ':attribute không được vượt quá :max.',
            'between' => ':attribute phải nằm trong khoảng :min đến :max.',
            'gt' => ':attribute phải lớn hơn :value.',
            'area.decimal' => 'Diện tích chỉ được có tối đa 2 chữ số thập phân.',
            'boolean' => ':attribute phải là giá trị đúng hoặc sai.',
            'building_id.exists' => 'Tòa nhà không tồn tại.',
            'code.unique' => 'Mã phòng đã được sử dụng trong tòa nhà này.',
            'base_price.max' => 'Giá niêm yết vượt khả năng biểu diễn chính xác của giao diện.',
            'deposit_amount.max' => 'Tiền cọc vượt khả năng biểu diễn chính xác của giao diện.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return [
            'building_id' => 'Tòa nhà',
            'code' => 'Mã phòng',
            'floor_number' => 'Tầng',
            'area' => 'Diện tích',
            'base_price' => 'Giá niêm yết',
            'deposit_amount' => 'Tiền cọc',
            'max_occupants' => 'Sức chứa',
            'is_public' => 'Công khai phòng',
            'description' => 'Mô tả',
            'status' => 'Trạng thái',
        ];
    }
}
