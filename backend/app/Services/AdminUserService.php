<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AdminUserService
{
    private const LIST_COLUMNS = ['id', 'full_name', 'email', 'phone', 'role', 'status', 'created_at'];

    public function ensureReady(): void
    {
        foreach (['users', 'contracts', 'rooms', 'buildings'] as $table) {
            if (! Schema::hasTable($table)) {
                abort(503, 'Dữ liệu tài khoản và hợp đồng chưa được triển khai đầy đủ trên môi trường này. Vui lòng liên hệ quản trị viên.');
            }
        }
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        $this->ensureReady();
        $query = $this->query();
        foreach (['role', 'status'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (isset($filters['has_active_contract'])) {
            if ((int) $filters['has_active_contract'] === 1) {
                $query->whereHas('activeContract');
            } else {
                $query->whereDoesntHave('activeContract');
            }
        }
        if (isset($filters['q']) && $filters['q'] !== '') {
            // LOCATE tìm chuỗi con literal: % và _ không có nghĩa wildcard như LIKE.
            $query->where(function (Builder $search) use ($filters): void {
                $search->whereRaw('LOCATE(?, users.full_name) > 0', [$filters['q']])
                    ->orWhereRaw('LOCATE(?, users.email) > 0', [$filters['q']])
                    ->orWhereRaw('LOCATE(?, users.phone) > 0', [$filters['q']]);
            });
        }

        return $query->orderBy('id')->paginate(20, ['*'], 'page', (int) ($filters['page'] ?? 1))->appends($filters);
    }

    public function find(string|int $id): User
    {
        $this->ensureReady();

        return $this->query()->addSelect(['id_number', 'date_of_birth', 'gender', 'permanent_address'])->findOrFail($id);
    }

    public function createStaff(#[\SensitiveParameter] array $data): User
    {
        $this->ensureReady();
        if (! in_array($data['role'], [UserRole::Technician->value, UserRole::Guard->value], true)) {
            throw ValidationException::withMessages(['role' => 'Chỉ được cấp tài khoản Kỹ thuật viên hoặc Bảo vệ.']);
        }

        try {
            return DB::transaction(function () use ($data): User {
                $user = new User([
                    'full_name' => $data['full_name'],
                    'phone' => $data['phone'],
                    'email' => $data['email'] ?? null,
                    'password' => $data['password'],
                ]);
                $user->role = UserRole::from($data['role']);
                $user->status = UserStatus::Active;
                $user->email_verified_at = null;
                $user->save();

                // Đọc đúng Resource tối thiểu trong cùng transaction; không thay phiên của Admin.
                return $this->query()->findOrFail($user->id);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Email hoặc số điện thoại vừa được sử dụng. Không thay đổi tài khoản hiện có.');
        } catch (QueryException) {
            // Không đính kèm exception gốc vì SQL/bindings có thể chứa hash hoặc dữ liệu cá nhân.
            report(new RuntimeException('Tạo tài khoản nhân viên thất bại do lỗi CSDL.'));
            abort(500, 'Không thể tạo tài khoản nhân viên lúc này. Vui lòng thử lại sau.');
        }
    }

    public function changeStatus(User $actor, string|int $id, UserStatus $status): User
    {
        $this->ensureReady();

        try {
            return DB::transaction(function () use ($actor, $id, $status): User {
                $target = User::query()->whereKey($id)->lockForUpdate()->firstOrFail();
                // Kiểm tra lại role/ID sau khi khóa, không tin bản đọc trước transaction.
                Gate::forUser($actor)->authorize('changeStatus', $target);
                if ($target->status !== $status) {
                    $target->status = $status;
                    $target->save();
                }

                return $this->query()->findOrFail($target->id);
            }, 3);
        } catch (QueryException) {
            report(new RuntimeException('Thay đổi trạng thái tài khoản thất bại do lỗi CSDL.'));
            abort(500, 'Không thể đổi trạng thái tài khoản lúc này. Vui lòng thử lại sau.');
        }
    }

    public function updateName(User $actor, string|int $id, #[\SensitiveParameter] string $fullName): User
    {
        $this->ensureReady();

        try {
            return DB::transaction(function () use ($actor, $id, $fullName): User {
                $target = User::query()->whereKey($id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('updateName', $target);
                if ($target->full_name !== $fullName) {
                    $target->full_name = $fullName;
                    $target->save();
                }

                return $this->query()->findOrFail($target->id);
            }, 3);
        } catch (QueryException) {
            report(new RuntimeException('Cập nhật họ tên thất bại do lỗi CSDL.'));
            abort(500, 'Không thể cập nhật họ tên lúc này. Vui lòng thử lại sau.');
        }
    }

    private function query(): Builder
    {
        return User::query()->select(self::LIST_COLUMNS)->with([
            'activeContract:id,user_id,room_id',
            'activeContract.room:id,code,building_id',
            'activeContract.room.building:id,name',
        ]);
    }
}
