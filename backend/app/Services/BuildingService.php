<?php

namespace App\Services;

use App\Enums\BuildingStatus;
use App\Models\Building;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BuildingService
{
    private const WRITABLE_FIELDS = ['name', 'address', 'total_floors', 'latitude', 'longitude', 'description'];

    public function paginate(): LengthAwarePaginator
    {
        return Building::query()->orderBy('id')->paginate(20);
    }

    public function create(array $data): Building
    {
        try {
            $building = new Building(Arr::only($data, self::WRITABLE_FIELDS));
            $building->status = BuildingStatus::Active;
            $building->save();

            return $building->refresh();
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Tên tòa nhà vừa được sử dụng. Vui lòng kiểm tra lại.');
        }
    }

    public function update(Building $building, array $data): Building
    {
        try {
            return DB::transaction(function () use ($building, $data): Building {
                $building = Building::query()->lockForUpdate()->findOrFail($building->id);

                if (isset($data['total_floors']) && $data['total_floors'] < $building->total_floors) {
                    if (! $building->getConnection()->getSchemaBuilder()->hasTable('rooms')) {
                        abort(409, 'Chưa thể kiểm tra phòng để giảm số tầng. Vui lòng thử lại sau.');
                    }

                    $highestFloor = $building->rooms()->max('floor_number');
                    if ($highestFloor !== null && $data['total_floors'] < $highestFloor) {
                        throw ValidationException::withMessages([
                            'total_floors' => 'Số tầng không được thấp hơn tầng cao nhất của phòng đang có.',
                        ]);
                    }
                }

                $building->fill(Arr::only($data, self::WRITABLE_FIELDS));
                $building->save();

                return $building->refresh();
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Tên tòa nhà vừa được sử dụng. Vui lòng kiểm tra lại.');
        }
    }
}
