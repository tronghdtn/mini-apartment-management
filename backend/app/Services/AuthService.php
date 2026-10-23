<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Support\AuthIdentity;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AuthService
{
    public function register(#[\SensitiveParameter] array $data): User
    {
        try {
            $user = new User([
                'full_name' => $data['full_name'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'password' => $data['password'],
            ]);
            $user->role = UserRole::User;
            $user->status = UserStatus::Active;
            $user->save();
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Email hoặc số điện thoại vừa được sử dụng. Vui lòng kiểm tra lại.');
        } catch (QueryException $e) {
            report(new RuntimeException('Đăng ký thất bại do lỗi CSDL, SQLSTATE: '.$e->getCode()));
            abort(500, 'Không thể tạo tài khoản lúc này. Vui lòng thử lại sau.');
        }

        Auth::guard('web')->login($user);

        return $user;
    }

    public function login(#[\SensitiveParameter] array $data): User
    {
        $identifier = $data['identifier'];
        $matches = str_contains($identifier, '@')
            ? User::where('email', $identifier)->limit(2)->get()
            : User::whereIn('phone', AuthIdentity::phoneVariants($identifier))->limit(2)->get();

        // Nhiều tài khoản cũ cùng SĐT tương đương: không đoán tài khoản theo mật khẩu.
        $id = $matches->count() === 1 ? $matches->first()->id : 0;
        $locked = false;
        $authenticated = Auth::guard('web')->attemptWhen([
            'id' => $id,
            'password' => $data['password'],
        ], function (User $user) use (&$locked): bool {
            $locked = ! $user->isActive();

            return ! $locked;
        });

        if ($locked) {
            abort(403, 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
        }
        if (! $authenticated) {
            throw ValidationException::withMessages(['identifier' => 'Thông tin đăng nhập không chính xác.']);
        }

        return Auth::guard('web')->user();
    }
}
