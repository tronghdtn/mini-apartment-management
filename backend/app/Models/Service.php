<?php

namespace App\Models;

use App\Enums\ServiceBillingType;
use App\Enums\ServiceStatus;
use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Danh mục dịch vụ (khoản thu) — docs/09_DATABASE_DESIGN.md §3.10.
 * `code`, `billing_type` khóa sau khi đã dùng: không cho mass-assign; tạo qua Service/Seeder tường minh.
 */
#[Fillable(['name', 'unit', 'price', 'status', 'description'])]
class Service extends Model
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory;

    public const CODE_ELECTRICITY = 'ELECTRICITY';

    public const CODE_WATER = 'WATER';

    protected $attributes = [
        'status' => 'active',
    ];

    protected function casts(): array
    {
        return [
            'billing_type' => ServiceBillingType::class,
            'status' => ServiceStatus::class,
            'price' => 'integer',
        ];
    }

    public function isMetered(): bool
    {
        return $this->billing_type === ServiceBillingType::Metered;
    }

    /** @param Builder<Service> $query */
    #[Scope]
    protected function metered(Builder $query): void
    {
        $query->where('billing_type', ServiceBillingType::Metered);
    }

    /** @return HasMany<ContractService, $this> */
    public function contractServices(): HasMany
    {
        return $this->hasMany(ContractService::class);
    }

    /** @return HasMany<UtilityPrice, $this> */
    public function utilityPrices(): HasMany
    {
        return $this->hasMany(UtilityPrice::class);
    }

    /** @return HasMany<MeterReading, $this> */
    public function meterReadings(): HasMany
    {
        return $this->hasMany(MeterReading::class);
    }
}
