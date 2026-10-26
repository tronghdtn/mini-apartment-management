<?php

namespace App\Services;

use App\Models\Amenity;
use App\Models\Building;
use App\Models\Room;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;

class PublicRoomService
{
    private const SORTS = [
        'price_asc' => ['base_price', 'asc'], 'price_desc' => ['base_price', 'desc'],
        'area_asc' => ['area', 'asc'], 'area_desc' => ['area', 'desc'],
    ];

    public function ensureReady(): void
    {
        foreach (['rooms', 'buildings', 'amenities', 'room_amenities', 'building_amenities'] as $table) {
            if (! Schema::hasTable($table)) {
                abort(503, 'Dữ liệu phòng công khai chưa sẵn sàng. Vui lòng thử lại sau.');
            }
        }
    }

    private function query(): Builder
    {
        $this->ensureReady();

        return Room::query()->publicAvailable()->with([
            'building:id,name,address,latitude,longitude',
            'building.amenities:id,name,description', 'amenities:id,name,description',
        ]);
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = $this->query();
        if (isset($filters['building_id'])) {
            $query->where('building_id', $filters['building_id']);
        }
        if (isset($filters['q']) && $filters['q'] !== '') {
            $query->where(function (Builder $search) use ($filters): void {
                $search->whereRaw('LOCATE(?, rooms.code) > 0', [$filters['q']])
                    ->orWhereHas('building', function (Builder $building) use ($filters): void {
                        $building->whereRaw('LOCATE(?, name) > 0', [$filters['q']])
                            ->orWhereRaw('LOCATE(?, address) > 0', [$filters['q']]);
                    });
            });
        }
        foreach (['price' => 'base_price', 'area' => 'area', 'occupants' => 'max_occupants'] as $key => $column) {
            foreach (['min' => '>=', 'max' => '<='] as $bound => $operator) {
                if (isset($filters[$bound.'_'.$key])) {
                    $query->where($column, $operator, $filters[$bound.'_'.$key]);
                }
            }
        }
        foreach ($filters['amenity_ids'] ?? [] as $id) {
            // Mỗi tiện nghi có thể đến từ tòa HOẶC phòng; các ID yêu cầu kết hợp AND.
            // SoftDeletes của Amenity loại tiện nghi archived (DB-D60), không sửa pivot.
            $query->where(function (Builder $amenity) use ($id): void {
                $amenity->whereHas('amenities', fn (Builder $q) => $q->whereKey($id))
                    ->orWhereHas('building.amenities', fn (Builder $q) => $q->whereKey($id));
            });
        }
        if (isset(self::SORTS[$filters['sort'] ?? ''])) {
            [$column, $direction] = self::SORTS[$filters['sort']];
            $query->orderBy($column, $direction);
        }

        return $query->orderBy('id')->paginate(20)->withQueryString();
    }

    public function find(string $id): Room
    {
        return $this->query()->findOrFail($id);
    }

    public function filterOptions(): array
    {
        $this->ensureReady();

        return [
            'buildings' => Building::query()->whereHas('rooms', fn (Builder $q) => $q->publicAvailable())
                ->orderBy('id')->get(['id', 'name'])->map->only(['id', 'name'])->all(),
            'amenities' => Amenity::query()->where(function (Builder $q): void {
                $q->whereHas('rooms', fn (Builder $rooms) => $rooms->publicAvailable())
                    ->orWhereHas('buildings.rooms', fn (Builder $rooms) => $rooms->publicAvailable());
            })->orderBy('id')->get(['id', 'name'])->map->only(['id', 'name'])->all(),
        ];
    }
}
