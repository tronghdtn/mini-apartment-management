<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceRequestStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\MaintenanceRequest;
use App\Models\Room;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class MaintenanceRequestService
{
    private const RELATIONS = ['room.building:id,name,address', 'reporter:id,full_name,phone', 'assignee:id,full_name', 'attachments'];

    public function ensureReady(): void
    {
        abort_unless(Schema::hasTable('maintenance_requests') && Schema::hasTable('attachments'), 503,
            'Yêu cầu sửa chữa chưa được triển khai đầy đủ trên môi trường này.');
    }

    public function context(User $actor): array
    {
        $this->ensureReady();
        $contract = Contract::with('room.building')->where('user_id', $actor->id)->where('status', ContractStatus::Active)->first();
        if ($contract === null) {
            throw ValidationException::withMessages(['contract' => 'Chỉ cư dân đang có hợp đồng hiệu lực mới gửi được yêu cầu sửa chữa.']);
        }

        return ['room' => ['id' => $contract->room_id, 'code' => $contract->room->code,
            'building_name' => $contract->room->building->name, 'address' => $contract->room->building->address]];
    }

    public function paginate(User $actor, array $filters): LengthAwarePaginator
    {
        $this->ensureReady();
        $query = $this->scope($actor)->with(self::RELATIONS);
        foreach (['status', 'priority', 'room_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        return $query->orderByDesc('id')->paginate(20)->withQueryString();
    }

    public function find(int $id): MaintenanceRequest
    {
        $this->ensureReady();

        return MaintenanceRequest::with(self::RELATIONS)->findOrFail($id);
    }

    /** @param array<string, mixed> $data @param array<int, UploadedFile> $photos */
    public function store(User $actor, array $data, array $photos): MaintenanceRequest
    {
        $this->ensureReady();
        $roomId = Contract::where('user_id', $actor->id)->where('status', ContractStatus::Active)->value('room_id');
        if ($roomId === null) {
            throw ValidationException::withMessages(['contract' => 'Không còn hợp đồng hiệu lực để gửi yêu cầu.']);
        }
        $paths = [];
        try {
            foreach ($photos as $photo) {
                $paths[] = $photo->store('maintenance', 'private');
            }
            $id = DB::transaction(function () use ($actor, $data, $photos, $paths, $roomId): int {
                Room::whereKey($roomId)->lockForUpdate()->firstOrFail();
                $contract = Contract::where('user_id', $actor->id)->where('room_id', $roomId)
                    ->where('status', ContractStatus::Active)->lockForUpdate()->first();
                abort_unless($contract !== null && $actor->fresh()->isActive() && $actor->fresh()->hasRole(UserRole::Resident), 409,
                    'Hợp đồng thuê đã thay đổi. Vui lòng tải lại trước khi gửi yêu cầu.');

                $request = new MaintenanceRequest;
                $request->contract_id = $contract->id;
                $request->room_id = $roomId;
                $request->user_id = $actor->id;
                $request->title = $data['title'];
                $request->description = $data['description'];
                $request->priority = MaintenancePriority::from($data['priority']);
                $request->status = MaintenanceRequestStatus::Pending;
                $request->save();
                $request->code = 'MR-'.now(config('app.business_timezone'))->format('Ym').'-'.str_pad((string) $request->id, 4, '0', STR_PAD_LEFT);
                $request->save();
                foreach ($photos as $index => $photo) {
                    $attachment = new Attachment;
                    $attachment->attachable_type = $request->getMorphClass();
                    $attachment->attachable_id = $request->id;
                    $attachment->collection = Attachment::MAINTENANCE_PHOTO;
                    $attachment->disk = 'private';
                    $attachment->path = $paths[$index];
                    $attachment->original_name = 'maintenance-photo-'.($index + 1).'.'.$photo->extension();
                    $attachment->mime_type = $photo->getMimeType();
                    $attachment->size_bytes = $photo->getSize();
                    $attachment->sort_order = $index;
                    $attachment->save();
                }

                return $request->id;
            }, 3);
        } catch (Throwable $failure) {
            foreach ($paths as $path) {
                Storage::disk('private')->delete($path);
            }
            if ($failure instanceof UniqueConstraintViolationException) {
                abort(409, 'Không thể sinh mã yêu cầu sửa chữa. Vui lòng thử lại.');
            }
            throw $failure;
        }

        return $this->find($id);
    }

    public function update(MaintenanceRequest $original, User $actor, array $data): MaintenanceRequest
    {
        $this->ensureReady();
        $id = DB::transaction(function () use ($original, $actor, $data): int {
            $request = $this->lock($original->id);
            abort_unless($actor->fresh()->isActive() && $actor->fresh()->hasRole(UserRole::Admin), 403);
            $this->assertOpen($request);
            if (array_key_exists('priority', $data)) {
                $request->priority = MaintenancePriority::from($data['priority']);
            }
            if (array_key_exists('admin_note', $data)) {
                $request->admin_note = $data['admin_note'];
            }
            $request->save();

            return $request->id;
        }, 3);

        return $this->find($id);
    }

    public function assign(MaintenanceRequest $original, User $actor, array $data): MaintenanceRequest
    {
        $this->ensureReady();
        $id = DB::transaction(function () use ($original, $actor, $data): int {
            $request = $this->lock($original->id);
            abort_unless($actor->fresh()->isActive() && $actor->fresh()->hasRole(UserRole::Admin), 403);
            $this->assertOpen($request);
            $technician = User::whereKey($data['assigned_to'])->lockForUpdate()->first();
            abort_unless($technician !== null && $technician->isActive() && $technician->hasRole(UserRole::Technician), 422,
                'Chỉ có thể phân công cho tài khoản kỹ thuật viên đang hoạt động.');
            $request->assigned_to = $technician->id;
            $request->assigned_at = now();
            if (isset($data['priority'])) {
                $request->priority = MaintenancePriority::from($data['priority']);
            }
            if (array_key_exists('admin_note', $data)) {
                $request->admin_note = $data['admin_note'];
            }
            $request->save();

            return $request->id;
        }, 3);

        return $this->find($id);
    }

    public function start(MaintenanceRequest $original, User $actor): MaintenanceRequest
    {
        return $this->transition($original, $actor, [MaintenanceRequestStatus::Pending], function (MaintenanceRequest $request): void {
            $request->status = MaintenanceRequestStatus::InProgress;
            $request->started_at = now();
        }, UserRole::Technician);
    }

    public function resolve(MaintenanceRequest $original, User $actor, string $note): MaintenanceRequest
    {
        return $this->transition($original, $actor, [MaintenanceRequestStatus::InProgress], function (MaintenanceRequest $request) use ($note): void {
            $request->status = MaintenanceRequestStatus::Resolved;
            $request->handler_note = $note;
            $request->resolved_at = now();
        }, UserRole::Technician);
    }

    public function reject(MaintenanceRequest $original, User $actor, string $note): MaintenanceRequest
    {
        return $this->transition($original, $actor, [MaintenanceRequestStatus::Pending, MaintenanceRequestStatus::InProgress], function (MaintenanceRequest $request) use ($note): void {
            $request->status = MaintenanceRequestStatus::Rejected;
            $request->admin_note = $note;
        }, UserRole::Admin);
    }

    public function reopen(MaintenanceRequest $original, User $actor): MaintenanceRequest
    {
        return $this->transition($original, $actor, [MaintenanceRequestStatus::Resolved], function (MaintenanceRequest $request): void {
            $request->status = MaintenanceRequestStatus::InProgress;
            $request->started_at = now();
            $request->resolved_at = null;
        }, UserRole::Admin);
    }

    public function photo(MaintenanceRequest $request, int $attachmentId): Attachment
    {
        return $request->attachments()->whereKey($attachmentId)->where('collection', Attachment::MAINTENANCE_PHOTO)
            ->where('disk', 'private')->firstOrFail();
    }

    private function scope(User $actor): Builder
    {
        $query = MaintenanceRequest::query();
        if ($actor->hasRole(UserRole::Resident)) {
            $query->where('user_id', $actor->id);
        } elseif ($actor->hasRole(UserRole::Technician)) {
            $query->where('assigned_to', $actor->id);
        }

        return $query;
    }

    private function lock(int $id): MaintenanceRequest
    {
        $roomId = MaintenanceRequest::whereKey($id)->value('room_id');
        abort_unless($roomId !== null, 404);
        Room::whereKey($roomId)->lockForUpdate()->firstOrFail();

        return MaintenanceRequest::whereKey($id)->lockForUpdate()->firstOrFail();
    }

    private function assertOpen(MaintenanceRequest $request): void
    {
        abort_unless(in_array($request->status, [MaintenanceRequestStatus::Pending, MaintenanceRequestStatus::InProgress], true),
            409, 'Yêu cầu đã đóng; không thể thay đổi thao tác này.');
    }

    /** @param list<MaintenanceRequestStatus> $from @param callable(MaintenanceRequest): void $change */
    private function transition(MaintenanceRequest $original, User $actor, array $from, callable $change, UserRole $role): MaintenanceRequest
    {
        $this->ensureReady();
        $id = DB::transaction(function () use ($original, $actor, $from, $change, $role): int {
            $request = $this->lock($original->id);
            $user = $actor->fresh();
            abort_unless($user !== null && $user->isActive() && $user->hasRole($role), 403);
            if ($role === UserRole::Technician) {
                abort_unless((int) $request->assigned_to === (int) $user->id, 403);
            }
            abort_unless(in_array($request->status, $from, true), 409, 'Trạng thái yêu cầu đã thay đổi. Vui lòng tải lại.');
            $change($request);
            $request->save();

            return $request->id;
        }, 3);

        return $this->find($id);
    }
}
