<?php

namespace App\Models;

use Database\Factories\AmenityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Tiện nghi — docs/09_DATABASE_DESIGN.md §3.4. Không sinh tiền, khác `services` (DB-D03). */
#[Fillable(['name', 'description'])]
class Amenity extends Model
{
    /** @use HasFactory<AmenityFactory> */
    use HasFactory, SoftDeletes;

    /** @return BelongsToMany<Building, $this> */
    public function buildings(): BelongsToMany
    {
        return $this->belongsToMany(Building::class, 'building_amenities');
    }

    /** @return BelongsToMany<Room, $this> */
    public function rooms(): BelongsToMany
    {
        return $this->belongsToMany(Room::class, 'room_amenities');
    }
}
