<?php

namespace App\Http\Requests\Room;

use App\Enums\RoomStatus;
use App\Models\Room;
use App\Services\RoomService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class IndexRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewAny', Room::class)) {
            return false;
        }

        app(RoomService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        return [
            'building_id' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::enum(RoomStatus::class)],
            'q' => ['nullable', 'string', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'integer' => ':attribute phải là số nguyên.',
            'min' => ':attribute phải từ :min trở lên.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute không được vượt quá :max ký tự.',
            'status.enum' => 'Trạng thái phòng không hợp lệ.',
        ];
    }

    public function attributes(): array
    {
        return ['building_id' => 'Tòa nhà', 'status' => 'Trạng thái', 'q' => 'Mã phòng tìm kiếm', 'page' => 'Trang'];
    }
}
