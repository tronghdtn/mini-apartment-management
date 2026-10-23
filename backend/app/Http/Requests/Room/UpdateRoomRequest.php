<?php

namespace App\Http\Requests\Room;

use App\Models\Room;
use App\Services\RoomService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateRoomRequest extends StoreRoomRequest
{
    private Room $targetRoom;

    public function authorize(): bool
    {
        if (! Gate::allows('create', Room::class)) {
            return false;
        }

        $this->targetRoom = app(RoomService::class)->find($this->route('room'));

        return Gate::allows('update', $this->targetRoom);
    }

    public function rules(): array
    {
        $rules = parent::rules();
        foreach (['building_id', 'code', 'floor_number', 'area', 'base_price', 'deposit_amount', 'max_occupants'] as $field) {
            array_unshift($rules[$field], 'sometimes');
        }
        $rules['building_id'][] = Rule::in([$this->targetRoom->building_id]);
        $rules['code'] = ['sometimes', 'required', 'string', 'max:50', Rule::unique(Room::class, 'code')->where('building_id', $this->targetRoom->building_id)->ignore($this->targetRoom)];

        return $rules;
    }

    public function messages(): array
    {
        return parent::messages() + ['building_id.in' => 'Chưa hỗ trợ chuyển phòng sang tòa nhà khác.'];
    }
}
