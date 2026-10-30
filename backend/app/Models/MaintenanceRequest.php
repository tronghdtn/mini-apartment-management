<?php

namespace App\Models;

use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceRequestStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/** A resident-owned maintenance request; identity, assignment and lifecycle are server controlled. */
#[Fillable(['title', 'description', 'priority'])]
class MaintenanceRequest extends Model
{
    protected $attributes = ['priority' => 'normal', 'status' => 'pending'];

    protected function casts(): array
    {
        return ['priority' => MaintenancePriority::class, 'status' => MaintenanceRequestStatus::class,
            'cost' => 'integer', 'assigned_at' => 'datetime', 'started_at' => 'datetime', 'resolved_at' => 'datetime'];
    }

    /** @return BelongsTo<Contract, $this> */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    /** @return BelongsTo<Room, $this> */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /** @return MorphMany<Attachment, $this> */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }
}
