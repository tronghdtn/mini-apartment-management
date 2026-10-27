<?php

namespace App\Models;

use App\Enums\MeterReadingSubmissionStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/** DB-D64: identity, ownership and review fields must be assigned by the server. */
#[Fillable(['period', 'reading_date', 'current_reading'])]
class MeterReadingSubmission extends Model
{
    protected $attributes = ['status' => 'pending'];

    protected function casts(): array
    {
        return [
            'status' => MeterReadingSubmissionStatus::class,
            'period' => 'date:Y-m-d',
            'reading_date' => 'date:Y-m-d',
            'current_reading' => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Room, $this> */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
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

    /** @return BelongsTo<User, $this> */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /** @return BelongsTo<MeterReading, $this> */
    public function approvedMeterReading(): BelongsTo
    {
        return $this->belongsTo(MeterReading::class, 'approved_meter_reading_id');
    }

    /** @return MorphMany<Attachment, $this> */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }
}
