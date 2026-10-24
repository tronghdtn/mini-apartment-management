<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Rules\UniquePhone;
use App\Support\AuthIdentity;
use App\Support\HiddenPasswordInput;
use App\Support\PasswordRules;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use RuntimeException;
use Symfony\Component\Console\Exception\RuntimeException as ConsoleRuntimeException;

class CreateAdminCommand extends Command
{
    protected $signature = 'app:create-admin';

    protected $description = 'Tạo mới tài khoản Admin bằng thông tin nhập tương tác, không nâng quyền tài khoản cũ';

    public function handle(): int
    {
        if (! $this->input->isInteractive()) {
            $this->error('Lệnh yêu cầu nhập tương tác trong terminal; không nhận mật khẩu qua tham số.');

            return self::FAILURE;
        }

        try {
            $data = [
                'full_name' => trim((string) $this->ask('Họ và tên')),
                'phone' => AuthIdentity::phone((string) $this->ask('Số điện thoại')),
                'email' => AuthIdentity::email((string) $this->ask('Email (bắt buộc cho Admin)')),
                'password' => HiddenPasswordInput::ask($this->output, 'Mật khẩu'),
                'password_confirmation' => HiddenPasswordInput::ask($this->output, 'Nhập lại mật khẩu'),
            ];
        } catch (ConsoleRuntimeException) {
            $this->error('Không thể nhập thông tin an toàn. Hãy dùng terminal hỗ trợ nhập mật khẩu ẩn. Chưa tạo tài khoản.');

            return self::FAILURE;
        }

        $validator = Validator::make($data, [
            'full_name' => ['required', 'string', 'max:120'],
            'phone' => ['bail', 'required', 'string', 'max:20', 'regex:/\A\+?[0-9]{10,15}\z/', new UniquePhone],
            'email' => ['required', 'string', 'email:rfc', 'max:191', Rule::unique(User::class, 'email')],
            'password' => PasswordRules::registration(),
        ], [
            'required' => ':attribute là bắt buộc.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute không được vượt quá :max ký tự.',
            'email.email' => 'Email không đúng định dạng.',
            'email.unique' => 'Email đã được sử dụng. Không thay đổi tài khoản hiện có.',
            'phone.regex' => 'Số điện thoại phải gồm 10–15 chữ số, có thể bắt đầu bằng dấu +.',
            'phone.unique' => 'Số điện thoại đã được sử dụng. Không thay đổi tài khoản hiện có.',
            'password.min' => 'Mật khẩu phải có ít nhất :min ký tự.',
            'password.confirmed' => 'Mật khẩu nhập lại không khớp.',
        ], [
            'full_name' => 'Họ và tên',
            'phone' => 'Số điện thoại',
            'email' => 'Email',
            'password' => 'Mật khẩu',
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $validated = $validator->validated();

        try {
            $user = new User([
                'full_name' => $validated['full_name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'password' => $validated['password'], // Cast hashed của User thực hiện băm.
            ]);
            // Gán tường minh; không mở role/status trong Fillable.
            $user->role = UserRole::Admin;
            $user->status = UserStatus::Active;
            $user->save(); // Một INSERT: không có bước nâng quyền/cập nhật tài khoản cũ.
        } catch (UniqueConstraintViolationException) {
            // UNIQUE bảo vệ cả khi tài khoản khác được tạo sau lúc validation.
            $this->error('Email hoặc số điện thoại vừa được sử dụng. Chưa tạo Admin; không thay đổi tài khoản hiện có.');

            return self::FAILURE;
        } catch (QueryException $e) {
            // Không đưa SQL/bindings (có hash mật khẩu) vào output hoặc log.
            report(new RuntimeException('Tạo Admin thất bại do lỗi CSDL, SQLSTATE: '.$e->getCode()));
            $this->error('Không thể lưu tài khoản Admin. Hãy kiểm tra kết nối và cấu trúc Database.');

            return self::FAILURE;
        }

        $this->info('Đã tạo tài khoản Admin mới (trạng thái: active). Email chưa được xác minh.');

        return self::SUCCESS;
    }
}
