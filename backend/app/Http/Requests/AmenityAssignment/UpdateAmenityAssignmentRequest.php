<?php

namespace App\Http\Requests\AmenityAssignment;

use App\Models\Amenity;
use App\Models\Building;
use App\Models\Room;
use App\Rules\NotBoolean;
use App\Services\AmenityAssignmentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateAmenityAssignmentRequest extends FormRequest
{
    private Building|Room $target;

    public function authorize(): bool
    {
        $forRoom = $this->route('room') !== null;
        if (! Gate::allows('viewAny', $forRoom ? Room::class : Building::class)) {
            return false;
        }
        $assignments = app(AmenityAssignmentService::class);
        $this->target = $forRoom
            ? $assignments->findRoom($this->route('room'))
            : $assignments->findBuilding($this->route('building'));

        return Gate::allows('update', $this->target);
    }

    public function target(): Building|Room
    {
        return $this->target;
    }

    public function rules(): array
    {
        return [
            'amenity_ids' => ['present', 'array', 'list'],
            'amenity_ids.*' => ['bail', new NotBoolean, 'integer', 'min:1', 'distinct', Rule::exists(Amenity::class, 'id')->whereNull('deleted_at')],
            'id' => ['missing'],
            'direct' => ['missing'],
            'inherited' => ['missing'],
            'effective' => ['missing'],
            'inherited_ids' => ['missing'],
            'effective_ids' => ['missing'],
            'inherited_amenity_ids' => ['missing'],
            'effective_amenity_ids' => ['missing'],
            'price' => ['missing'],
            'base_price' => ['missing'],
            'deposit_amount' => ['missing'],
            'status' => ['missing'],
            'role' => ['missing'],
            'user_id' => ['missing'],
            'building_id' => ['missing'],
            'room_id' => ['missing'],
            'is_archived' => ['missing'],
        ];
    }

    public function messages(): array
    {
        return [
            'amenity_ids.present' => 'Cần gửi danh sách tiện nghi, có thể để danh sách rỗng.',
            'amenity_ids.array' => 'Danh sách tiện nghi phải là một mảng.',
            'amenity_ids.list' => 'Danh sách tiện nghi phải là một danh sách có thứ tự.',
            'amenity_ids.*.integer' => 'Mã tiện nghi phải là số nguyên.',
            'amenity_ids.*.min' => 'Mã tiện nghi phải từ 1 trở lên.',
            'amenity_ids.*.distinct' => 'Danh sách tiện nghi không được trùng mã.',
            'amenity_ids.*.exists' => 'Tiện nghi không tồn tại hoặc đã được lưu trữ.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }
}
