<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\MeterReadingSubmission;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Ramsey\Uuid\Uuid;
use RuntimeException;
use Throwable;

class NotificationService
{
    public function ensureReady(): void
    {
        abort_unless(Schema::hasTable('notifications'), 503, 'Thông báo chưa được triển khai trên môi trường này.');
    }

    public function query(User $user): Builder
    {
        $this->ensureReady();

        return Notification::where('notifiable_type', 'user')->where('notifiable_id', $user->id);
    }

    public function saved(Model $model): void
    {
        $status = $model->getAttribute('status');
        $status = $status instanceof \BackedEnum ? $status->value : $status;
        $event = null;
        $recipient = null;
        if ($model instanceof Invoice && $model->wasChanged('issued_at') && $model->issued_at !== null) {
            $event = 'invoice.issued';
            $recipient = $model->contract()->withTrashed()->value('user_id');
        } elseif ($model instanceof Payment && $model->wasChanged('status') && in_array($status, ['confirmed', 'rejected'], true)) {
            $event = 'payment.'.$status;
            $recipient = Contract::withTrashed()->whereKey($model->invoice->contract_id)->value('user_id');
        } elseif ($model instanceof Contract && $model->wasChanged('status') && in_array($status, ['active', 'terminated'], true)) {
            $event = 'contract.'.$status;
            $recipient = $model->user_id;
        } elseif ($model instanceof MeterReadingSubmission) {
            if ($model->wasRecentlyCreated && $status === 'pending') {
                $event = 'meter.submitted';
            } elseif ($model->wasChanged('status') && in_array($status, ['approved', 'rejected'], true)) {
                $event = 'meter.'.$status;
                $recipient = $model->submitted_by;
            }
        }
        if ($event === null) {
            return;
        }
        $sourceId = (int) $model->id;
        $invoiceId = $model instanceof Payment ? (int) $model->invoice_id : $sourceId;
        // Capture scalar event context before models can change again or a transaction rolls back.
        DB::afterCommit(function () use ($event, $sourceId, $invoiceId, $recipient): void {
            try {
                if (! Schema::hasTable('notifications')) {
                    return; // Pending M20 must not block existing financial modules or migrate dev implicitly.
                }
                $ids = $event === 'meter.submitted'
                    ? User::where('role', UserRole::Admin)->where('status', 'active')->pluck('id')->all()
                    : [$recipient];
                foreach ($ids as $id) {
                    $user = User::find($id);
                    if ($user === null) {
                        continue;
                    }
                    $data = $this->payload($event, $sourceId, $invoiceId);
                    DB::table('notifications')->insertOrIgnore([
                        'id' => (string) Uuid::uuid5(Uuid::NAMESPACE_URL, 'mini-apartment:'.$event.':'.$sourceId.':'.$id),
                        'type' => $event, 'notifiable_type' => 'user', 'notifiable_id' => $id,
                        'data' => json_encode($data, JSON_THROW_ON_ERROR), 'read_at' => null,
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
            } catch (Throwable) {
                // The financial transaction has already committed. Report safely; never invite a second payment.
                report(new RuntimeException('Không thể ghi thông báo sau giao dịch. Cần kiểm tra kênh thông báo.'));
            }
        });
    }

    private function payload(string $event, int $sourceId, int $invoiceId): array
    {
        [$title, $body, $link] = match ($event) {
            'invoice.issued' => ['Hóa đơn đã phát hành', 'Hóa đơn mới đã sẵn sàng để xem.', '/resident/invoices/'.$sourceId],
            'payment.confirmed' => ['Thanh toán đã xác nhận', 'Khoản thực nhận đã được đối soát. Xem hóa đơn để kiểm tra số dư.', '/resident/invoices/'.$invoiceId],
            'payment.rejected' => ['Minh chứng chưa được chấp nhận', 'Vui lòng mở hóa đơn để xem kết quả đối soát.', '/resident/invoices/'.$invoiceId],
            'contract.active' => ['Hợp đồng đã kích hoạt', 'Hợp đồng thuê của bạn đã có hiệu lực.', '/resident/contracts/'.$sourceId],
            'contract.terminated' => ['Hợp đồng đã thanh lý', 'Bạn vẫn có thể xem các hóa đơn và khoản nợ của mình.', '/resident/invoices'],
            'meter.submitted' => ['Có ảnh chỉ số cần duyệt', 'Một yêu cầu gửi chỉ số đang chờ kiểm tra.', '/admin/meter-readings'],
            'meter.approved' => ['Chỉ số đã được duyệt', 'Yêu cầu đã trở thành chỉ số chính thức.', '/resident'],
            'meter.rejected' => ['Yêu cầu chỉ số bị từ chối', 'Mở lịch sử gửi chỉ số để xem lý do.', '/resident'],
        };

        return compact('title', 'body', 'link');
    }
}
