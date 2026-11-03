<?php

namespace App\Notifications;

use App\Services\AccountEmailService;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Email xác minh địa chỉ hiện tại của tài khoản (DB-D95); chỉ kênh mail, gửi đồng bộ (DB-D23). */
class VerifyEmailNotification extends Notification
{
    public function __construct(private readonly string $url) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject('Xác minh email tài khoản MiniApart')
            ->greeting('Xin chào '.$notifiable->full_name.',')
            ->line('Bấm nút bên dưới để xác minh email dùng cho tài khoản của bạn.')
            ->action('Xác minh email', $this->url)
            ->line('Liên kết có hiệu lực '.AccountEmailService::LINK_MINUTES.' phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.')
            ->salutation('Ban quản lý MiniApart');
    }
}
