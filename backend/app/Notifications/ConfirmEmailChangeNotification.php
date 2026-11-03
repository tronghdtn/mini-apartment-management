<?php

namespace App\Notifications;

use App\Services\AccountEmailService;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Gửi tới email MỚI; email tài khoản chỉ đổi khi người nhận bấm xác nhận (Q10, DB-D95). */
class ConfirmEmailChangeNotification extends Notification
{
    public function __construct(private readonly string $fullName, private readonly string $url) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject('Xác nhận đổi email tài khoản MiniApart')
            ->greeting('Xin chào '.$this->fullName.',')
            ->line('Bạn vừa yêu cầu dùng địa chỉ này làm email đăng nhập. Bấm nút bên dưới để xác nhận.')
            ->action('Xác nhận email mới', $this->url)
            ->line('Liên kết có hiệu lực '.AccountEmailService::LINK_MINUTES.' phút. Email cũ vẫn được dùng cho tới khi bạn xác nhận.')
            ->salutation('Ban quản lý MiniApart');
    }
}
