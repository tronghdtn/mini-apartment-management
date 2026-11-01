<?php

namespace App\Models;

use App\Enums\BuildingStatus;
use App\Enums\ContractStatus;
use App\Enums\RoomStatus;
use Database\Factories\RoomFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Phòng — docs/09_DATABASE_DESIGN.md §3.3.
 * `status` không mass-assign: occupied/available do vòng đời hợp đồng quyết định.
 */
#[Fillable(['building_id', 'code', 'floor_number', 'area', 'base_price', 'deposit_amount', 'max_occupants', 'is_public', 'description'])]
class Room extends Model
{
    /** @use HasFactory<RoomFactory> */
    use HasFactory;

    protected $attributes = [
        'status' => 'available',
        'is_public' => false,
    ];

    protected function casts(): array
    {
        return [
            'floor_number' => 'integer',
            'area' => 'decimal:2',
            'base_price' => 'integer',
            'deposit_amount' => 'integer',
            'max_occupants' => 'integer',
            'status' => RoomStatus::class,
            'is_public' => 'boolean',
        ];
    }

    /** Phòng hiển thị cho khách: công khai và còn trống. @param Builder<Room> $query */
    #[Scope]
    protected function publicAvailable(Builder $query): void
    {
        $query->where('is_public', true)->where('status', RoomStatus::Available)
            ->whereHas('building', fn (Builder $building) => $building->where('status', BuildingStatus::Active));
    }

    /** @return MorphMany<Attachment, $this> */
    public function photos(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable')
            ->where('collection', Attachment::ROOM_GALLERY)->where('disk', 'private')
            ->orderByDesc('is_cover')->orderBy('sort_order')->orderBy('id');
    }

    /** @return BelongsTo<Building, $this> */
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    /** Tiện nghi riêng của phòng (pivot room_amenities). @return BelongsToMany<Amenity, $this> */
    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'room_amenities');
    }

    /**
     * Tiện nghi hiển thị = tiện nghi tòa ∪ tiện nghi phòng, không trùng (09 §3.5, DB-02).
     *
     * @return Collection<int, Amenity>
     */
    public function allAmenities(): Collection
    {
        return $this->building->amenities->merge($this->amenities)->unique('id')->values();
    }

    /** @return HasMany<Contract, $this> */
    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    /** @return HasOne<Contract, $this> */
    public function activeContract(): HasOne
    {
        return $this->hasOne(Contract::class)->where('status', ContractStatus::Active);
    }

    /** Mọi chỉ số của phòng, kể cả khi phòng trống (contract_id NULL). @return HasMany<MeterReading, $this> */
    public function meterReadings(): HasMany
    {
        return $this->hasMany(MeterReading::class);
    }
}
