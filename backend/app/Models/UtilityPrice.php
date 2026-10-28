<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Lịch sử giá điện/nước — docs/09_DATABASE_DESIGN.md §3.12.
 * `effective_from` luôn ngày 01 (DB-D26), không làm thay đổi kỳ đã có chỉ số/hóa đơn (DB-D33).
 */
#[Fillable(['building_id', 'service_id', 'unit_price', 'effective_from'])]
class UtilityPrice extends Model
{
    protected function casts(): array
    {
        return [
            'unit_price' => 'integer',
            'effective_from' => 'date:Y-m-d',
        ];
    }

    /** @return BelongsTo<Service, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /** @return BelongsTo<Building, $this> */
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }
}
