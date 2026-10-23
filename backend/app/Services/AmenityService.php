<?php

namespace App\Services;

use App\Models\Amenity;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class AmenityService
{
    private const WRITABLE_FIELDS = ['name', 'description'];

    public function paginate(): LengthAwarePaginator
    {
        return Amenity::query()->orderBy('id')->paginate(20);
    }

    public function create(array $data): Amenity
    {
        try {
            return Amenity::query()->create(Arr::only($data, self::WRITABLE_FIELDS))->refresh();
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Tên tiện nghi vừa được sử dụng. Vui lòng kiểm tra lại.');
        }
    }

    public function update(Amenity $amenity, array $data): Amenity
    {
        try {
            return DB::transaction(function () use ($amenity, $data): Amenity {
                $amenity = Amenity::query()->lockForUpdate()->findOrFail($amenity->id);
                $amenity->fill(Arr::only($data, self::WRITABLE_FIELDS));
                $amenity->save();

                return $amenity->refresh();
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Tên tiện nghi vừa được sử dụng. Vui lòng kiểm tra lại.');
        }
    }

    public function archive(Amenity $amenity): void
    {
        DB::transaction(function () use ($amenity): void {
            $amenity = Amenity::query()->lockForUpdate()->findOrFail($amenity->id);
            // SoftDeletes giữ bản ghi và mọi pivot; không detach hoặc forceDelete.
            $amenity->delete();
        }, 3);
    }
}
