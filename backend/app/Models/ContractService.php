<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Đăng ký dịch vụ theo hợp đồng — docs/09_DATABASE_DESIGN.md §3.11.
 * Bảng `contract_services`; khác lớp nghiệp vụ trong app/Services. `end_date` inclusive, NULL = còn hiệu lực.
 * `unit_price` NULL với dịch vụ metered (điện/nước tính theo chỉ số).
 */
#[Fillable(['service_id', 'quantity', 'unit_price', 'start_date', 'end_date'])]
class ContractService extends Model
{
    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_price' => 'integer',
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
        ];
    }

    /**
     * Dòng có hiệu lực giao với khoảng [$from, $to] (bao gồm hai đầu).
     *
     * @param  Builder<ContractService>  $query
     */
    #[Scope]
    protected function effectiveBetween(Builder $query, string $from, string $to): void
    {
        $query->where('start_date', '<=', $to)
            ->where(fn (Builder $q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $from));
    }

    /** @return BelongsTo<Contract, $this> */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
