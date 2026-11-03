<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\ContractStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Notifications\ResetPasswordNotification;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Tài khoản cho 5 actor (docs/09_DATABASE_DESIGN.md §3.1). Khách vãng lai không có dòng trong users.
 *
 * `role`, `status` không nằm trong Fillable: chỉ đổi qua thao tác nghiệp vụ tường minh
 * (ví dụ kích hoạt hợp đồng user → resident), không nhận từ request.
 * `id_number` (CCCD) ẩn khỏi serialization mặc định (DB-D19).
 */
#[Fillable(['full_name', 'email', 'phone', 'password', 'id_number', 'date_of_birth', 'gender', 'permanent_address'])]
#[Hidden(['password', 'remember_token', 'id_number'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /** Giá trị mặc định khớp DEFAULT của cột, có ngay trên model chưa lưu. */
    protected $attributes = [
        'role' => 'user',
        'status' => 'active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'status' => UserStatus::class,
            'date_of_birth' => 'date:Y-m-d',
        ];
    }

    public function hasRole(UserRole $role): bool
    {
        return $this->role === $role;
    }

    /** Liên kết đặt lại mật khẩu tiếng Việt trỏ về trang React (DB-D95), thay thông báo mặc định của Laravel. */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    /** Mọi hợp đồng đứng tên đại diện, kể cả đã thanh lý (cư dân vẫn xem lịch sử — DB-D36). @return HasMany<Contract, $this> */
    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    /** Hợp đồng đang hiệu lực (tối đa 1 — UNIQUE active_tenant_id). @return HasOne<Contract, $this> */
    public function activeContract(): HasOne
    {
        return $this->hasOne(Contract::class)->where('status', ContractStatus::Active);
    }

    /**
     * "Đang thuê" suy ra từ hợp đồng active, không từ `role` (DB-D36): sau thanh lý vẫn giữ `resident`
     * để xem lịch sử, nhưng thao tác cần hợp đồng active phải kiểm tra hàm này.
     */
    public function hasActiveContract(): bool
    {
        return $this->activeContract()->exists();
    }
}
