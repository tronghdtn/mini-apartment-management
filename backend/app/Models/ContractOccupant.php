<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Người ở cùng, không bắt buộc có tài khoản — docs/09_DATABASE_DESIGN.md §3.9. */
#[Fillable(['full_name', 'phone', 'relationship'])]
class ContractOccupant extends Model
{
    /** @return BelongsTo<Contract, $this> */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }
}
