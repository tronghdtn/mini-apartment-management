<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use App\Support\AuthIdentity;
use App\Support\HiddenPasswordInput;
use App\Support\PasswordRules;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Console\Exception\RuntimeException as ConsoleRuntimeException;

class ResetAdminPasswordCommand extends Command
{
    protected $signature = 'app:reset-admin-password';

    protected $description = 'Người vận hành đặt lại mật khẩu Admin qua nhập ẩn và xác nhận, không đổi quyền hoặc trạng thái';

    public function handle(): int
    {
        if (! $this->input->isInteractive()) {
            $this->error('Lệnh yêu cầu terminal tương tác; không nhận mật khẩu qua tham số.');

            return self::FAILURE;
        }

        $identifier = AuthIdentity::identifier((string) $this->ask('Email hoặc số điện thoại Admin'));
        $matches = str_contains($identifier, '@')
            ? User::where('email', $identifier)->limit(2)->get()
            : User::whereIn('phone', AuthIdentity::phoneVariants($identifier))->limit(2)->get();
        $target = $matches->count() === 1 ? $matches->first() : null;
        if (! $target || $target->role !== UserRole::Admin || ! $target->isActive()) {
            $this->error('Không tìm thấy duy nhất một Admin đang hoạt động. Không thay đổi tài khoản.');

            return self::FAILURE;
        }

        try {
            $data = [
                'password' => HiddenPasswordInput::ask($this->output, 'Mật khẩu mới'),
                'password_confirmation' => HiddenPasswordInput::ask($this->output, 'Nhập lại mật khẩu mới'),
            ];
        } catch (ConsoleRuntimeException) {
            $this->error('Không thể nhập mật khẩu ẩn an toàn. Không thay đổi tài khoản.');

            return self::FAILURE;
        }

        $validator = Validator::make($data, ['password' => PasswordRules::registration()], [
            'password.required' => 'Mật khẩu mới là bắt buộc.',
            'password.string' => 'Mật khẩu mới phải là chuỗi ký tự.',
            'password.min' => 'Mật khẩu mới phải có ít nhất :min ký tự.',
            'password.confirmed' => 'Mật khẩu nhập lại không khớp.',
        ]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }
        if (! $this->confirm('Đặt lại mật khẩu cho Admin #'.$target->id.'? Quyền và trạng thái được giữ nguyên.', false)) {
            $this->info('Đã hủy. Không thay đổi tài khoản.');

            return self::SUCCESS;
        }

        $password = $validator->validated()['password'];
        try {
            $updated = DB::transaction(function () use ($target, $password): bool {
                $user = User::whereKey($target->id)->lockForUpdate()->first();
                if (! $user || $user->role !== UserRole::Admin || ! $user->isActive()
                    || $user->getAuthPassword() !== $target->getAuthPassword()
                    || $user->email !== $target->email || $user->phone !== $target->phone) {
                    return false;
                }
                $user->password = $password; // Cast hashed của Laravel; không thêm dấu Enter.
                $user->setRememberToken(Str::random(60));
                $user->save();

                return true;
            }, 3);
        } catch (QueryException) {
            report(new RuntimeException('Đặt lại mật khẩu Admin thất bại do lỗi CSDL.'));
            $this->error('Không thể lưu mật khẩu mới. Giao dịch đã hủy.');

            return self::FAILURE;
        }
        if (! $updated) {
            $this->error('Tài khoản vừa thay đổi. Không ghi đè; hãy kiểm tra và chạy lại.');

            return self::FAILURE;
        }
        $this->info('Đã đặt lại mật khẩu Admin. Hãy đăng nhập lại; quyền, trạng thái và dữ liệu nghiệp vụ được giữ nguyên.');

        return self::SUCCESS;
    }
}
