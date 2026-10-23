<?php

namespace App\Services;

use App\Models\Amenity;
use App\Models\Building;
use App\Models\Room;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AmenityAssignmentService
{
    public function ensureReady(bool $forRoom = false): void
    {
        $tables = ['buildings', 'amenities', 'building_amenities'];
        if ($forRoom) {
            $tables = [...$tables, 'rooms', 'room_amenities'];
        }
        foreach ($tables as $table) {
            if (! Schema::hasTable($table)) {
                abort(503, 'Dữ liệu gán tiện nghi chưa được triển khai đầy đủ trên môi trường này. Vui lòng liên hệ quản trị viên.');
            }
        }
    }

    public function findBuilding(string|int $id): Building
    {
        $this->ensureReady();

        return Building::query()->findOrFail($id);
    }

    public function findRoom(string|int $id): Room
    {
        $this->ensureReady(forRoom: true);

        return Room::query()->findOrFail($id);
    }

    public function forBuilding(Building $building): array
    {
        $this->ensureReady();
        $direct = $building->amenities()->withTrashed()->orderBy('amenities.id')->get();

        return ['direct' => $direct, 'inherited' => new Collection, 'effective' => $direct];
    }

    public function forRoom(Room $room): array
    {
        $this->ensureReady(forRoom: true);
        $direct = $room->amenities()->withTrashed()->orderBy('amenities.id')->get();
        $inherited = $room->building->amenities()->withTrashed()->orderBy('amenities.id')->get();

        return [
            'direct' => $direct,
            'inherited' => $inherited,
            'effective' => $direct->merge($inherited)->unique('id')->sortBy('id')->values(),
        ];
    }

    public function update(Building|Room $target, array $amenityIds): array
    {
        $forRoom = $target instanceof Room;
        $this->ensureReady($forRoom);

        try {
            return DB::transaction(function () use ($target, $amenityIds, $forRoom): array {
                // Mọi thao tác cùng cha được tuần tự hóa; không khóa ngược từ Room lên Building.
                $building = Building::query()->lockForUpdate()->findOrFail($forRoom ? $target->building_id : $target->id);
                $target = $forRoom ? Room::query()->lockForUpdate()->findOrFail($target->id) : $building;
                $pivotTable = $forRoom ? 'room_amenities' : 'building_amenities';
                $parentKey = $forRoom ? 'room_id' : 'building_id';

                // Current read: không dùng snapshot cũ để phân loại liên kết vừa được lưu trữ.
                $currentIds = DB::table($pivotTable)->where($parentKey, $target->id)->orderBy('amenity_id')->lockForUpdate()->pluck('amenity_id')->map(fn ($id): int => (int) $id)->all();
                $requestedIds = array_map(fn ($id): int => (int) $id, $amenityIds);
                $allIds = array_values(array_unique([...$currentIds, ...$requestedIds]));
                sort($allIds, SORT_NUMERIC);
                $amenities = Amenity::withTrashed()->whereIn('id', $allIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

                foreach ($requestedIds as $id) {
                    $amenity = $amenities->get($id);
                    if ($amenity === null || $amenity->trashed()) {
                        throw ValidationException::withMessages(['amenity_ids' => 'Có tiện nghi không tồn tại hoặc vừa được lưu trữ. Vui lòng tải lại danh mục.']);
                    }
                }

                $archivedIds = array_values(array_filter($currentIds, fn (int $id): bool => $amenities->get($id)?->trashed() === true));
                $target->amenities()->sync(array_values(array_unique([...$requestedIds, ...$archivedIds])));

                return $forRoom ? $this->forRoom($target) : $this->forBuilding($target);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Liên kết tiện nghi vừa thay đổi. Vui lòng tải lại dữ liệu và thử lại.');
        }
    }
}
