<?php

namespace App\Services;

use App\Enums\RoomStatus;
use App\Models\Building;
use App\Models\Room;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class RoomService
{
    private array $tables = [];

    private const WRITABLE_FIELDS = ['code', 'floor_number', 'area', 'base_price', 'deposit_amount', 'max_occupants', 'is_public', 'description'];

    public function ensureReady(): void
    {
        $this->tables = Schema::getTableListing(null, false);
        if (! in_array('rooms', $this->tables, true)) {
            abort(503, 'Dữ liệu phòng chưa được triển khai trên môi trường này. Vui lòng liên hệ quản trị viên.');
        }
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        $this->ensureReady();
        $query = Room::query()->with($this->relations());
        if (isset($filters['building_id'])) {
            $query->where('building_id', $filters['building_id']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['q']) && $filters['q'] !== '') {
            $query->where('code', 'like', '%'.$filters['q'].'%');
        }

        return $query->orderBy('id')->paginate(20)->withQueryString();
    }

    public function find(string|int $id): Room
    {
        $this->ensureReady();

        return Room::query()->with($this->relations())->findOrFail($id);
    }

    public function create(array $data): Room
    {
        $this->ensureReady();

        try {
            return DB::transaction(function () use ($data): Room {
                $building = Building::query()->lockForUpdate()->findOrFail($data['building_id']);
                $this->validateFloor($building, $data['floor_number']);

                $room = new Room(Arr::only($data, self::WRITABLE_FIELDS));
                $room->building_id = $building->id;
                $room->status = RoomStatus::Available;
                $room->save();

                return $room->refresh()->load($this->relations());
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Mã phòng vừa được sử dụng trong tòa nhà này. Vui lòng kiểm tra lại.');
        }
    }

    public function update(Room $room, array $data): Room
    {
        $this->ensureReady();

        try {
            return DB::transaction(function () use ($room, $data): Room {
                // Khóa tòa trước phòng để đồng bộ với thao tác giảm tầng của BuildingService.
                $building = Building::query()->lockForUpdate()->findOrFail($room->building_id);
                $room = Room::query()->lockForUpdate()->findOrFail($room->id);
                if (isset($data['building_id']) && (int) $data['building_id'] !== $room->building_id) {
                    throw ValidationException::withMessages(['building_id' => 'Chưa hỗ trợ chuyển phòng sang tòa nhà khác.']);
                }
                $this->validateFloor($building, $data['floor_number'] ?? $room->floor_number);

                $room->fill(Arr::only($data, self::WRITABLE_FIELDS));
                $room->save();

                return $room->refresh()->load($this->relations());
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Mã phòng vừa được sử dụng trong tòa nhà này. Vui lòng kiểm tra lại.');
        }
    }

    private function relations(): array
    {
        // Các API phòng vẫn dùng được ở baseline trước M19; chưa có bảng thì chưa có metadata ảnh.
        return ['building:id,name', ...(in_array('attachments', $this->tables, true) ? ['photos'] : [])];
    }

    private function validateFloor(Building $building, int $floor): void
    {
        if ($floor < 1 || $floor > $building->total_floors) {
            throw ValidationException::withMessages(['floor_number' => 'Tầng phải từ 1 đến số tầng của tòa nhà.']);
        }
    }
}
