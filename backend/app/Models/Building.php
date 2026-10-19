<?php

namespace App\Models;

use App\Enums\BuildingStatus;
use Database\Factories\BuildingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Tòa nhà — docs/09_DATABASE_DESIGN.md §3.2. */
#[Fillable(['name', 'address', 'total_floors', 'latitude', 'longitude', 'description', 'status'])]
class Building extends Model
{
    /** @use HasFactory<BuildingFactory> */
    use HasFactory;

    protected $attributes = [
        'status' => 'active',
    ];

    protected function casts(): array
    {
        return [
            'total_floors' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'status' => BuildingStatus::class,
        ];
    }

    /** @return HasMany<Room, $this> */
    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    /** Tiện nghi cấp tòa (pivot building_amenities, DB-D01). @return BelongsToMany<Amenity, $this> */
    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'building_amenities');
    }
}
