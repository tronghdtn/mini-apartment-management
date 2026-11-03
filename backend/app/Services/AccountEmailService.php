<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\ConfirmEmailChangeNotification;
use App\Notifications\VerifyEmailNotification;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

/**
 * DB-D95: khôi phục mật khẩu (Q4), xác minh và đổi email (Q10) qua liên kết gửi email.
 * Không schema mới: dùng users.email_verified_at và password_reset_tokens của Laravel.
 */
class AccountEmailService
{
    public const LINK_MINUTES = 60;

    /** Luôn kết thúc như nhau để không lộ email có tồn tại; chỉ gửi khi tài khoản active và email đã xác minh. */
    public function requestPasswordReset(string $email): void
    {
        $user = User::where('email', $email)->first();
        if ($user === null || ! $user->isActive() || $user->email_verified_at === null) {
            return;
        }
        try {
            // Broker tự giới hạn gửi lại (auth.passwords.users.throttle); kết quả không trả về client.
            Password::broker()->sendResetLink(['email' => $user->email]);
        } catch (TransportExceptionInterface $failure) {
            report($failure);
        }
    }

    public function resetPassword(#[\SensitiveParameter] array $data): void
    {
        $status = Password::broker()->reset($data, function (User $user, string $password): void {
            DB::transaction(function () use ($user, $password): void {
                $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
                if (! $locked->isActive() || $locked->email_verified_at === null || $locked->email !== $user->email) {
                    throw ValidationException::withMessages(['token' => 'Liên kết đặt lại mật khẩu không còn hiệu lực.']);
                }
                $locked->password = $password;
                $locked->remember_token = Str::random(60);
                $locked->save();
                if (config('session.driver') === 'database') {
                    DB::table(config('session.table', 'sessions'))->where('user_id', $locked->id)->delete();
                }
            }, 3);
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.']);
        }
    }

    public function sendVerification(User $user): void
    {
        abort_if($user->email === null, 409, 'Tài khoản chưa có email để xác minh.');
        abort_if($user->email_verified_at !== null, 409, 'Email đã được xác minh.');
        $expires = CarbonImmutable::now()->addMinutes(self::LINK_MINUTES)->getTimestamp();
        $query = ['id' => $user->id, 'hash' => sha1($user->email), 'expires' => $expires];
        $query['signature'] = $this->signature($query);
        $this->deliver(fn () => $user->notify(new VerifyEmailNotification($this->frontendUrl('/verify-email', $query))));
    }

    /** Liên kết chứng minh sở hữu email hiện tại; email đổi sau khi gửi thì liên kết cũ vô hiệu. */
    public function verify(array $data): void
    {
        $query = ['id' => (int) $data['id'], 'hash' => $data['hash'], 'expires' => (int) $data['expires']];
        if (! hash_equals($this->signature($query), $data['signature']) || $query['expires'] < CarbonImmutable::now()->getTimestamp()) {
            $this->invalidLink('Liên kết xác minh không hợp lệ hoặc đã hết hạn.');
        }
        DB::transaction(function () use ($query): void {
            $user = User::whereKey($query['id'])->lockForUpdate()->first();
            if ($user === null || ! $user->isActive() || $user->email === null || ! hash_equals(sha1($user->email), $query['hash'])) {
                $this->invalidLink('Liên kết xác minh không còn hiệu lực.');
            }
            if ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }
        }, 3);
    }

    public function requestChange(User $actor, #[\SensitiveParameter] array $data): void
    {
        $user = User::findOrFail($actor->id);
        if (! Hash::check($data['current_password'], $user->getAuthPassword())) {
            throw ValidationException::withMessages(['current_password' => 'Mật khẩu hiện tại không chính xác.']);
        }
        if ($user->email === $data['email']) {
            throw ValidationException::withMessages(['email' => 'Email mới phải khác email hiện tại.']);
        }
        if (User::where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages(['email' => 'Email đã được sử dụng.']);
        }
        // Mã hóa + MAC bằng APP_KEY: không để email mới ở dạng thô trên URL, không sửa được payload.
        $token = Crypt::encryptString(json_encode(['uid' => $user->id, 'email' => $data['email'], 'current' => sha1($user->email ?? ''),
            'exp' => CarbonImmutable::now()->addMinutes(self::LINK_MINUTES)->getTimestamp()]));
        $this->deliver(fn () => Notification::route('mail', $data['email'])
            ->notify(new ConfirmEmailChangeNotification($user->full_name, $this->frontendUrl('/confirm-email-change', ['token' => $token]))));
    }

    public function confirmChange(string $token): User
    {
        try {
            $payload = json_decode(Crypt::decryptString($token), true, 4, JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            $this->invalidLink('Liên kết xác nhận email không hợp lệ.');
        }
        if (! is_array($payload) || ! is_int($payload['uid'] ?? null) || ! is_string($payload['email'] ?? null)
            || ! is_string($payload['current'] ?? null) || ! is_int($payload['exp'] ?? null) || $payload['exp'] < CarbonImmutable::now()->getTimestamp()) {
            $this->invalidLink('Liên kết xác nhận email không hợp lệ hoặc đã hết hạn.');
        }

        try {
            return DB::transaction(function () use ($payload): User {
                $user = User::whereKey($payload['uid'])->lockForUpdate()->first();
                if ($user === null || ! $user->isActive()) {
                    $this->invalidLink('Liên kết xác nhận email không còn hiệu lực.');
                }
                // Dùng một lần: sau khi đổi, email hiện tại khác giá trị trong liên kết.
                abort_unless(hash_equals(sha1($user->email ?? ''), $payload['current']), 409, 'Email tài khoản đã thay đổi; yêu cầu này không còn hiệu lực.');
                abort_if(User::where('email', $payload['email'])->whereKeyNot($user->id)->exists(), 409, 'Email đã được tài khoản khác sử dụng.');
                $old = $user->email;
                $user->forceFill(['email' => $payload['email'], 'email_verified_at' => now()])->save();
                if ($old !== null) {
                    DB::table('password_reset_tokens')->where('email', $old)->delete();
                }

                return $user->refresh();
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Email đã được tài khoản khác sử dụng.');
        }
    }

    private function signature(array $query): string
    {
        return hash_hmac('sha256', implode('|', ['verify-email', $query['id'], $query['hash'], $query['expires']]), (string) config('app.key'));
    }

    private function frontendUrl(string $path, array $query): string
    {
        return rtrim((string) config('app.url'), '/').$path.'?'.http_build_query($query);
    }

    private function deliver(callable $send): void
    {
        try {
            $send();
        } catch (TransportExceptionInterface $failure) {
            report($failure);
            abort(503, 'Chưa gửi được email. Vui lòng thử lại sau.');
        }
    }

    private function invalidLink(string $message): never
    {
        throw ValidationException::withMessages(['link' => $message]);
    }
}
