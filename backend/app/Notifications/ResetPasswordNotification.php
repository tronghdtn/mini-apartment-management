<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Liên kết đặt lại mật khẩu trỏ về trang React; token do Password broker sinh và lưu băm (Q4, DB-D95). */
class ResetPasswordNotification extends Notification
{
    public function __construct(#[\SensitiveParameter] private readonly string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim((string) config('app.url'), '/').'/reset-password?'.http_build_query(['token' => $this->token, 'email' => $notifiable->email]);
        $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)->subject('Đặt lại mật khẩu MiniApart')
            ->greeting('Xin chào '.$notifiable->full_name.',')
            ->line('Bạn vừa yêu cầu đặt lại mật khẩu. Bấm nút bên dưới để đặt mật khẩu mới.')
            ->action('Đặt lại mật khẩu', $url)
            ->line('Liên kết có hiệu lực '.$minutes.' phút và chỉ dùng một lần. Đặt lại thành công sẽ đăng xuất mọi thiết bị.')
            ->line('Nếu bạn không yêu cầu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên.')
            ->salutation('Ban quản lý MiniApart');
    }
}
