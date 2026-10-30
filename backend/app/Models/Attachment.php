<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/** Metadata is server-assigned; no client-controlled path, disk or ownership. */
#[Hidden(['path'])]
class Attachment extends Model
{
    public const METER_READING_PHOTO = 'meter_reading_photo';

    public const MAINTENANCE_PHOTO = 'maintenance_photo';

    public const PAYMENT_PROOF = 'payment_proof';

    protected function casts(): array
    {
        return ['is_cover' => 'boolean', 'sort_order' => 'integer', 'size_bytes' => 'integer'];
    }

    /** @return MorphTo<Model, $this> */
    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }
}
