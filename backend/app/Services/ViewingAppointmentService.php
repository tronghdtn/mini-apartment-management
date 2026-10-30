<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Enums\RoomStatus;
use App\Enums\UserRole;
use App\Models\Room;
use App\Models\User;
use App\Models\ViewingAppointment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class ViewingAppointmentService
{
    public function ensureReady(): void
    {
        abort_unless(Schema::hasTable('viewing_appointments'), 503, 'Đặt lịch xem phòng chưa được triển khai trên môi trường này.');
    }

    public function query(User $user, array $filters): Builder
    {
        $query = ViewingAppointment::with('room.building');
        if ($user->role === UserRole::Guard) {
            $day = CarbonImmutable::now(config('app.business_timezone'))->startOfDay();
            $query->where('status', AppointmentStatus::Confirmed)->where('preferred_at', '>=', $day->utc())
                ->where('preferred_at', '<', $day->addDay()->utc());
        } elseif ($user->role !== UserRole::Admin) {
            $query->where('user_id', $user->id);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['date'])) {
            $day = CarbonImmutable::parse($filters['date'], config('app.business_timezone'))->startOfDay();
            $query->where('preferred_at', '>=', $day->utc())->where('preferred_at', '<', $day->addDay()->utc());
        }

        return $query;
    }

    public function store(array $data, ?User $user, string $ip): ViewingAppointment
    {
        $time = $this->time($data['preferred_at']);

        return DB::transaction(function () use ($data, $user, $ip, $time) {
            $room = Room::whereKey($data['room_id'])->lockForUpdate()->firstOrFail();
            $this->available($room);
            abort_if(ViewingAppointment::where('room_id', $room->id)->where('guest_phone', $data['guest_phone'])
                ->whereIn('status', ['pending', 'confirmed'])->exists(), 409, 'Số điện thoại này đã có lịch đang chờ hoặc đã xác nhận cho phòng.');
            $item = new ViewingAppointment;
            $item->forceFill(['room_id' => $room->id, 'user_id' => $user?->id, 'guest_name' => $data['guest_name'],
                'guest_phone' => $data['guest_phone'], 'preferred_at' => $time->utc(), 'ip_address' => $ip, 'status' => AppointmentStatus::Pending]);
            $item->save();
            $item->forceFill(['code' => 'APT-'.$time->format('Ym').'-'.str_pad((string) $item->id, 4, '0', STR_PAD_LEFT)])->save();

            return $item->load('room.building');
        });
    }

    public function change(int $id, User $user, string $action, array $data): ViewingAppointment
    {
        // Same parent lock as room editing/activation: serialize duplicates and room availability.
        $reference = ViewingAppointment::findOrFail($id);

        return DB::transaction(function () use ($reference, $user, $action, $data) {
            $room = Room::whereKey($reference->room_id)->lockForUpdate()->firstOrFail();
            $item = ViewingAppointment::whereKey($reference->id)->lockForUpdate()->firstOrFail();
            Gate::authorize(match ($action) {
                'cancel' => 'cancel', 'checkIn', 'checkOut' => 'check', default => 'manage'
            }, $item);
            $open = in_array($item->status, [AppointmentStatus::Pending, AppointmentStatus::Confirmed], true);
            abort_unless($open, 409, 'Lịch đã kết thúc, không thể thay đổi.');
            if ($action === 'cancel') {
                abort_if($item->checked_in_at !== null, 409, 'Khách đã check-in, không thể hủy lịch.');
                abort_if($user->role !== UserRole::Admin && ! $item->preferred_at->isFuture(), 409, 'Đã tới giờ hẹn, vui lòng liên hệ quản trị viên.');
                $item->status = AppointmentStatus::Cancelled;
            } elseif ($action === 'reschedule') {
                abort_if($item->checked_in_at !== null, 409, 'Khách đã check-in, không thể đổi giờ.');
                $this->available($room);
                $item->preferred_at = $this->time($data['preferred_at'])->utc();
                $item->status = AppointmentStatus::Pending;
                $item->admin_note = $data['admin_note'];
            } elseif ($action === 'confirm') {
                $this->available($room);
                abort_unless($item->status === AppointmentStatus::Pending && $item->preferred_at->isFuture(), 409, 'Chỉ xác nhận lịch đang chờ và chưa tới giờ.');
                $item->status = AppointmentStatus::Confirmed;
                $item->admin_note = $data['admin_note'] ?? $item->admin_note;
            } elseif ($action === 'complete') {
                abort_unless($item->status === AppointmentStatus::Confirmed && $item->checked_out_at !== null, 409, 'Chỉ hoàn tất lịch đã xác nhận và check-out.');
                $item->status = AppointmentStatus::Completed;
                $item->admin_note = $data['admin_note'] ?? $item->admin_note;
            } else {
                abort_if($action === 'checkIn' ? $item->checked_in_at !== null : ($item->checked_in_at === null || $item->checked_out_at !== null), 409, 'Thứ tự check-in/check-out không hợp lệ hoặc đã thực hiện.');
                $prefix = $action === 'checkIn' ? 'checked_in' : 'checked_out';
                $item->{$prefix.'_at'} = now();
                $item->{$prefix.'_by'} = $user->id;
                $item->guard_note = $data['guard_note'] ?? $item->guard_note;
            }
            $item->save();

            return $item->load('room.building');
        });
    }

    private function available(Room $room): void
    {
        abort_unless($room->is_public && $room->status === RoomStatus::Available && ! $room->activeContract()->exists(), 409, 'Phòng không còn sẵn sàng để đặt hoặc xác nhận lịch xem.');
    }

    private function time(string $value): CarbonImmutable
    {
        $time = CarbonImmutable::parse($value)->setTimezone(config('app.business_timezone'));
        if (! $time->isFuture() || $time->getTimestamp() > 2147483647 || $time->format('H:i:s') < '08:00:00' || $time->format('H:i:s') > '20:00:00') {
            throw ValidationException::withMessages(['preferred_at' => 'Chọn thời gian tương lai trong 08:00–20:00 giờ Việt Nam.']);
        }

        return $time;
    }
}
