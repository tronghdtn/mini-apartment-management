<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AccountProfileService
{
    public function updateName(User $actor, array $data): User
    {
        try {
            return DB::transaction(function () use ($actor, $data) {
                $user = $this->lockedUser($actor);
                $user->full_name = $data['full_name'];
                $user->save();

                return $user;
            }, 3);
        } catch (QueryException $failure) {
            $this->databaseFailure($failure);
        }
    }

    public function changePassword(User $actor, #[\SensitiveParameter] array $data): void
    {
        try {
            DB::transaction(function () use ($actor, $data) {
                $user = $this->lockedUser($actor);
                if (! Hash::check($data['current_password'], $user->getAuthPassword())) {
                    throw ValidationException::withMessages(['current_password' => 'Mật khẩu hiện tại không chính xác.']);
                }
                if (Hash::check($data['password'], $user->getAuthPassword())) {
                    throw ValidationException::withMessages(['password' => 'Mật khẩu mới phải khác mật khẩu hiện tại.']);
                }
                $user->password = $data['password']; // User cast hashes exactly once, preserving whitespace.
                $user->remember_token = Str::random(60);
                $user->save();
                if (config('session.driver') === 'database') {
                    // The project's sessions share the same MySQL transaction; never touch other users' sessions.
                    DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
                }
            }, 3);
        } catch (QueryException $failure) {
            $this->databaseFailure($failure);
        }
    }

    private function lockedUser(User $actor): User
    {
        $user = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
        abort_unless($user->isActive(), 403, 'Tài khoản đã bị khóa.');
        abort_unless(hash_equals($user->getAuthPassword(), $actor->getAuthPassword()), 409, 'Mật khẩu vừa thay đổi. Vui lòng đăng nhập lại.');

        return $user;
    }

    private function databaseFailure(QueryException $failure): never
    {
        report(new RuntimeException('Cập nhật tài khoản thất bại, SQLSTATE: '.$failure->getCode()));
        abort(500, 'Không thể cập nhật tài khoản lúc này. Vui lòng thử lại.');
    }
}
