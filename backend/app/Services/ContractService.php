<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\DepositStatus;
use App\Enums\RoomStatus;
use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ContractService
{
    private const WRITABLE_FIELDS = ['room_id', 'user_id', 'start_date', 'end_date', 'monthly_rent', 'deposit_amount', 'occupant_count', 'note'];

    public function ensureReady(): void
    {
        foreach (['contracts', 'rooms', 'users', 'buildings', 'contract_occupants', 'contract_services'] as $table) {
            if (! Schema::hasTable($table)) {
                abort(503, 'Dữ liệu hợp đồng chưa được triển khai đầy đủ trên môi trường này. Vui lòng liên hệ quản trị viên.');
            }
        }
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        $this->ensureReady();
        $query = $this->query();
        foreach (['status', 'room_id', 'user_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (isset($filters['building_id'])) {
            $query->whereHas('room', fn (Builder $room) => $room->where('building_id', $filters['building_id']));
        }
        if (isset($filters['q']) && $filters['q'] !== '') {
            $query->where(function (Builder $search) use ($filters): void {
                // Tìm chuỗi literal, không biến % và _ thành wildcard; mọi giá trị đều có binding.
                $search->whereRaw('LOCATE(?, contracts.contract_number) > 0', [$filters['q']])
                    ->orWhereHas('room', fn (Builder $room) => $room->whereRaw('LOCATE(?, rooms.code) > 0', [$filters['q']]))
                    ->orWhereHas('tenant', function (Builder $tenant) use ($filters): void {
                        $tenant->whereRaw('LOCATE(?, users.full_name) > 0', [$filters['q']])
                            ->orWhereRaw('LOCATE(?, users.email) > 0', [$filters['q']])
                            ->orWhereRaw('LOCATE(?, users.phone) > 0', [$filters['q']]);
                    });
            });
        }

        return $query->orderBy('id')->paginate(20, ['*'], 'page', (int) ($filters['page'] ?? 1))->appends($filters);
    }

    public function find(string|int $id): Contract
    {
        $this->ensureReady();

        return $this->query()->findOrFail($id);
    }

    public function create(#[\SensitiveParameter] array $data): Contract
    {
        $this->ensureReady();

        try {
            return DB::transaction(function () use ($data): Contract {
                [$rooms, $users] = $this->lockParents([(int) $data['room_id']], [(int) $data['user_id']]);
                $room = $rooms[(int) $data['room_id']];
                $tenant = $users[(int) $data['user_id']];
                $this->validateDraftData($room, $tenant, $data);

                $contract = new Contract(Arr::only($data, self::WRITABLE_FIELDS));
                $contract->status = ContractStatus::Draft;
                $contract->deposit_status = DepositStatus::Unpaid;
                $contract->contract_number = null;
                $contract->save();

                return $this->query()->findOrFail($contract->id);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Dữ liệu hợp đồng vừa xung đột. Vui lòng tải lại và thử lại.');
        } catch (QueryException) {
            $this->databaseFailure('tạo');
        }
    }

    public function update(Contract $contract, #[\SensitiveParameter] array $data): Contract
    {
        $this->ensureReady();

        try {
            return DB::transaction(function () use ($contract, $data): Contract {
                [$rooms, $users] = $this->lockParents(
                    [$contract->room_id, (int) ($data['room_id'] ?? $contract->room_id)],
                    [$contract->user_id, (int) ($data['user_id'] ?? $contract->user_id)],
                );
                $current = Contract::query()->whereKey($contract->id)->lockForUpdate()->firstOrFail();
                $this->ensureUnchangedParents($contract, $current);
                $this->ensureDraft($current);

                // PATCH kiểm tra tập dữ liệu sau ghép, không chỉ các ô vừa gửi.
                $merged = array_replace(Arr::only($current->getRawOriginal(), self::WRITABLE_FIELDS), Arr::only($data, self::WRITABLE_FIELDS));
                $this->validateDraftData($rooms[(int) $merged['room_id']], $users[(int) $merged['user_id']], $merged);
                $current->fill(Arr::only($data, self::WRITABLE_FIELDS));
                $current->save();

                return $this->query()->findOrFail($current->id);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Dữ liệu hợp đồng vừa xung đột. Vui lòng tải lại và thử lại.');
        } catch (QueryException) {
            $this->databaseFailure('cập nhật');
        }
    }

    public function delete(Contract $contract): void
    {
        $this->ensureReady();

        try {
            DB::transaction(function () use ($contract): void {
                $this->lockParents([$contract->room_id], [$contract->user_id]);
                $current = Contract::query()->whereKey($contract->id)->lockForUpdate()->firstOrFail();
                $this->ensureUnchangedParents($contract, $current);
                $this->ensureDraft($current);
                if ($current->occupants()->exists() || $current->contractServices()->exists()
                    || Contract::withTrashed()->where('renewed_from_id', $current->id)->exists()) {
                    abort(409, 'Hợp đồng đã có dữ liệu liên quan. Không thể xóa nháp này.');
                }
                // Nhóm 3 chưa có trên dev: không bắt buộc triển khai để quản lý bản nháp.
                foreach (['invoices', 'meter_readings'] as $table) {
                    if (Schema::hasTable($table) && DB::table($table)->where('contract_id', $current->id)->exists()) {
                        abort(409, 'Hợp đồng đã có lịch sử liên quan. Không thể xóa nháp này.');
                    }
                }
                $current->delete();
            }, 3);
        } catch (QueryException) {
            $this->databaseFailure('xóa nháp');
        }
    }

    /** Khóa cha theo thứ tự rooms → users; nhiều dòng cùng bảng theo ID tăng dần (DB-D29). */
    private function lockParents(array $roomIds, array $userIds): array
    {
        $rooms = Room::query()->whereIn('id', array_unique($roomIds))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        $users = User::query()->whereIn('id', array_unique($userIds))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        if ($rooms->count() !== count(array_unique($roomIds))) {
            throw ValidationException::withMessages(['room_id' => 'Phòng không còn tồn tại. Vui lòng chọn lại.']);
        }
        if ($users->count() !== count(array_unique($userIds))) {
            throw ValidationException::withMessages(['user_id' => 'Tài khoản người thuê không còn tồn tại. Vui lòng chọn lại.']);
        }

        return [$rooms, $users];
    }

    private function ensureUnchangedParents(Contract $before, Contract $current): void
    {
        if ($before->room_id !== $current->room_id || $before->user_id !== $current->user_id) {
            // Không khóa ngược lên phòng/người thuê mới sau khi đã khóa contracts.
            abort(409, 'Phòng hoặc người thuê của bản nháp vừa thay đổi. Vui lòng tải lại và thử lại.');
        }
    }

    private function ensureDraft(Contract $contract): void
    {
        if ($contract->status !== ContractStatus::Draft) {
            abort(409, 'Chỉ được sửa hoặc xóa hợp đồng nháp. Hợp đồng đã có hiệu lực được giữ nguyên.');
        }
    }

    private function validateDraftData(Room $room, User $tenant, #[\SensitiveParameter] array $data): void
    {
        if ($room->status !== RoomStatus::Available || $room->activeContract()->exists()) {
            abort(409, 'Chỉ lập hoặc sửa nháp với phòng đang trống. Vui lòng chọn lại phòng.');
        }
        if (! $tenant->isActive() || ! in_array($tenant->role, [UserRole::User, UserRole::Resident], true)) {
            throw ValidationException::withMessages(['user_id' => 'Người thuê phải là tài khoản Khách hoặc Cư dân đang hoạt động.']);
        }
        if ($tenant->hasActiveContract()) {
            abort(409, 'Người thuê đã có hợp đồng đang hiệu lực. Vui lòng chọn lại.');
        }
        if ($data['end_date'] <= $data['start_date']) {
            throw ValidationException::withMessages(['end_date' => 'Ngày cuối được ở phải sau ngày bắt đầu.']);
        }
        if ((int) $data['occupant_count'] > $room->max_occupants) {
            throw ValidationException::withMessages(['occupant_count' => 'Số người ở không được vượt quá sức chứa của phòng.']);
        }
    }

    private function query(): Builder
    {
        return Contract::query()->with([
            'room:id,building_id,code,status,max_occupants',
            'room.building:id,name',
            'tenant:id,full_name,phone,email,role,status',
        ]);
    }

    private function databaseFailure(string $operation): never
    {
        // SQL/bindings có thể chứa ghi chú hoặc định danh; không report exception gốc.
        report(new RuntimeException('Thao tác hợp đồng thất bại do lỗi CSDL.'));
        abort(500, 'Không thể '.$operation.' hợp đồng lúc này. Vui lòng thử lại sau.');
    }
}
