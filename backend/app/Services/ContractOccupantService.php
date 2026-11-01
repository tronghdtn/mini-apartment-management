<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ContractOccupantService
{
    private const FIELDS = ['full_name', 'phone', 'relationship'];

    public function read(string $id, User $actor): array
    {
        $this->ensureReady();

        return DB::transaction(function () use ($id, $actor): array {
            $contract = $this->find($id);
            Gate::forUser($actor)->authorize('view', $contract);

            return $this->snapshot($contract);
        });
    }

    public function store(string $id, User $actor, #[\SensitiveParameter] array $data): array
    {
        return $this->mutate($id, $actor, $data['expected_revision'], function (Contract $contract) use ($data): array {
            if ($contract->occupants->count() + 2 > $contract->room->max_occupants) {
                throw ValidationException::withMessages(['full_name' => 'Thêm người này sẽ vượt sức chứa của phòng (gồm người đại diện).']);
            }
            $contract->occupants()->create(Arr::only($data, self::FIELDS));

            return $this->snapshot($contract->load('occupants'));
        });
    }

    public function update(string $id, User $actor, int $occupant, #[\SensitiveParameter] array $data): array
    {
        return $this->mutate($id, $actor, $data['expected_revision'], function (Contract $contract) use ($occupant, $data): array {
            $row = $contract->occupants()->findOrFail($occupant);
            $row->fill(Arr::only($data, self::FIELDS));
            $row->save();

            return $this->snapshot($contract->load('occupants'));
        }, $occupant);
    }

    public function remove(string $id, User $actor, int $occupant, string $revision): void
    {
        $this->mutate($id, $actor, $revision, function (Contract $contract) use ($occupant): void {
            $contract->occupants()->findOrFail($occupant)->delete();
        }, $occupant, checkCapacity: false);
    }

    private function mutate(string $id, User $actor, string $revision, callable $action, ?int $occupant = null, bool $checkCapacity = true): mixed
    {
        $this->ensureReady();
        try {
            $before = $this->find($id);

            return DB::transaction(function () use ($before, $actor, $revision, $action, $occupant, $checkCapacity) {
                $room = Room::whereKey($before->room_id)->lockForUpdate()->firstOrFail();
                $users = User::whereIn('id', [$before->user_id, $actor->id])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $contract = Contract::whereKey($before->id)->lockForUpdate()->firstOrFail();
                abort_unless($contract->room_id === $before->room_id && $contract->user_id === $before->user_id,
                    409, 'Phòng hoặc người đại diện vừa thay đổi. Vui lòng tải lại danh sách.');
                $freshActor = $users->get($actor->id);
                abort_unless($freshActor, 403, 'Tài khoản không còn quyền thao tác.');
                Gate::forUser($freshActor)->authorize('update', $contract);
                abort_unless($contract->status === ContractStatus::Draft, 409, 'Chỉ được sửa người ở cùng trên hợp đồng nháp.');
                $contract->setRelation('room', $room);
                $contract->setRelation('occupants', $contract->occupants()->orderBy('id')->lockForUpdate()->get());
                $contract->load(['contractServices' => fn ($lines) => $lines->orderBy('id')]);
                if ($occupant !== null) {
                    abort_unless($contract->occupants->contains('id', $occupant), 404);
                }
                abort_unless(hash_equals($this->revision($contract), $revision), 409, 'Danh sách hoặc hợp đồng đã thay đổi. Vui lòng tải lại trước khi lưu.');
                if ($checkCapacity && max($contract->occupant_count, 1 + $contract->occupants->count()) > $room->max_occupants) {
                    throw ValidationException::withMessages(['full_name' => 'Số người đã khai báo hoặc có hồ sơ vượt sức chứa phòng. Vui lòng kiểm tra bản nháp.']);
                }

                return $action($contract);
            }, 3);
        } catch (QueryException) {
            // Không report SQL/bindings vì có thể chứa tên hoặc số điện thoại.
            report(new RuntimeException('Thao tác hồ sơ người ở cùng thất bại do lỗi CSDL.'));
            abort(500, 'Không thể lưu danh sách người ở cùng lúc này. Vui lòng tải lại trước khi thử lại.');
        }
    }

    private function find(string $id): Contract
    {
        return Contract::with(['room', 'occupants' => fn ($rows) => $rows->orderBy('id'),
            'contractServices' => fn ($rows) => $rows->orderBy('id')])->findOrFail($id);
    }

    private function snapshot(Contract $contract): array
    {
        $registered = 1 + $contract->occupants->count();

        return ['contract_id' => $contract->id, 'contract_status' => $contract->status->value,
            'occupant_count' => $contract->occupant_count, 'max_occupants' => $contract->room->max_occupants,
            'registered_count' => $registered, 'has_count_mismatch' => $registered !== $contract->occupant_count,
            'can_edit' => $contract->status === ContractStatus::Draft, 'revision' => $this->revision($contract),
            'occupants' => $contract->occupants->sortBy('id')->values()->map(fn ($row) => [
                'id' => $row->id, 'full_name' => $row->full_name, 'phone' => $row->phone, 'relationship' => $row->relationship,
            ])->all()];
    }

    private function revision(Contract $contract): string
    {
        return hash('sha256', json_encode([$contract->lifecycleRevision(), $contract->room->max_occupants], JSON_THROW_ON_ERROR));
    }

    private function ensureReady(): void
    {
        $tables = Schema::getTableListing(null, false);
        foreach (['contracts', 'rooms', 'users', 'contract_occupants', 'contract_services'] as $table) {
            abort_unless(in_array($table, $tables, true), 503, 'Dữ liệu người ở cùng chưa sẵn sàng. Vui lòng thử lại sau.');
        }
    }
}
