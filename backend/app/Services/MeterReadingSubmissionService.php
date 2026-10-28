<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\MeterReadingSubmissionStatus;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\MeterReadingSubmission;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class MeterReadingSubmissionService
{
    private const RELATIONS = ['room.building:id,name', 'service:id,code,name,unit', 'attachments'];

    public function __construct(private readonly MeterReadingService $readings) {}

    public function ensureReady(): void
    {
        $this->readings->ensureReady();
        abort_unless(Schema::hasTable('meter_reading_submissions') && Schema::hasTable('attachments'), 503,
            'Cấu trúc gửi ảnh chỉ số chưa sẵn sàng trên môi trường này.');
    }

    public function paginate(User $actor, array $filters): LengthAwarePaginator
    {
        $query = MeterReadingSubmission::with(self::RELATIONS);
        if (! $actor->hasRole(UserRole::Admin)) {
            $query->where('submitted_by', $actor->id)->whereHas('contract', fn ($q) => $q->where('user_id', $actor->id));
        }
        foreach (['status', 'period', 'room_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        return $query->orderByDesc('id')->paginate(20)->withQueryString();
    }

    public function context(User $actor): array
    {
        $contract = Contract::with('room.building')->where('user_id', $actor->id)->where('status', ContractStatus::Active)->firstOrFail();

        return ['contract_id' => $contract->id, 'room' => ['id' => $contract->room_id, 'code' => $contract->room->code,
            'building_name' => $contract->room->building->name],
            'services' => Service::whereIn('code', [Service::CODE_ELECTRICITY, Service::CODE_WATER])
                ->where('status', ServiceStatus::Active)->where('billing_type', 'metered')->orderBy('id')->get(['id', 'name', 'unit'])
                ->map(fn ($service) => ['id' => $service->id, 'name' => $service->name, 'unit' => $service->unit])->all()];
    }

    public function find(int $id): MeterReadingSubmission
    {
        return MeterReadingSubmission::with(self::RELATIONS)->findOrFail($id);
    }

    public function store(User $actor, array $data, UploadedFile $photo): MeterReadingSubmission
    {
        $this->ensureReady();
        $contract = Contract::where('user_id', $actor->id)->where('status', ContractStatus::Active)->firstOrFail();
        $path = $photo->store('meter-readings', 'private');
        try {
            return $this->readings->withLockedContext([['room_id' => $contract->room_id, ...$data]], function () use ($actor, $contract, $data, $photo, $path) {
                $current = $contract->fresh();
                $user = $actor->fresh();
                abort_unless($user->isActive() && $user->hasRole(UserRole::Resident) && $current->status === ContractStatus::Active
                    && $current->user_id === $user->id, 409, 'Hợp đồng đang thuê đã thay đổi. Vui lòng tải lại.');
                $context = $this->readings->context($current->room_id, $data);
                if ($context['contract_id'] !== $current->id || bccomp($data['current_reading'], $context['previous_reading'], 2) < 0) {
                    throw ValidationException::withMessages(['current_reading' => 'Chỉ số không hợp lệ với hợp đồng và mốc hiện tại.']);
                }
                $submission = new MeterReadingSubmission(['period' => $data['period'], 'reading_date' => $data['reading_date'],
                    'current_reading' => $data['current_reading']]);
                $submission->room_id = $current->room_id;
                $submission->contract_id = $current->id;
                $submission->service_id = $data['service_id'];
                $submission->submitted_by = $user->id;
                $submission->save();
                $attachment = new Attachment;
                $attachment->attachable_type = $submission->getMorphClass();
                $attachment->attachable_id = $submission->id;
                $attachment->collection = Attachment::METER_READING_PHOTO;
                $attachment->disk = 'private';
                $attachment->path = $path;
                $attachment->original_name = 'meter-reading.'.$photo->extension();
                $attachment->mime_type = $photo->getMimeType();
                $attachment->size_bytes = $photo->getSize();
                $attachment->save();

                return $this->find($submission->id);
            });
        } catch (Throwable $failure) {
            Storage::disk('private')->delete($path);
            if ($failure instanceof UniqueConstraintViolationException) {
                abort(409, 'Đã có yêu cầu chờ duyệt cho phòng/dịch vụ/kỳ này.');
            }
            throw $failure;
        }
    }

    public function approve(MeterReadingSubmission $original, User $actor): MeterReadingSubmission
    {
        // A completed review is immutable. Replay must not revalidate today's meter/service state.
        if ($original->status === MeterReadingSubmissionStatus::Approved) {
            return DB::transaction(function () use ($original, $actor) {
                Room::whereKey($original->room_id)->lockForUpdate()->firstOrFail();
                $current = MeterReadingSubmission::whereKey($original->id)->lockForUpdate()->firstOrFail();
                $reviewer = $actor->fresh();
                abort_unless($reviewer->isActive() && $reviewer->hasRole(UserRole::Admin), 403, 'Bạn không có quyền duyệt.');
                abort_unless($current->status === MeterReadingSubmissionStatus::Approved, 409, 'Yêu cầu đã thay đổi.');

                return $this->find($current->id);
            }, 3);
        }
        $data = ['room_id' => $original->room_id, 'service_id' => $original->service_id, 'period' => $original->period->format('Y-m-d'),
            'reading_date' => $original->reading_date->format('Y-m-d'), 'current_reading' => $original->current_reading];

        return $this->readings->withLockedContext([$data], function () use ($original, $actor, $data) {
            $submission = MeterReadingSubmission::whereKey($original->id)->lockForUpdate()->firstOrFail();
            abort_unless($actor->fresh()->isActive() && $actor->fresh()->hasRole(UserRole::Admin), 403, 'Bạn không có quyền duyệt.');
            if ($submission->status === MeterReadingSubmissionStatus::Approved) {
                return $this->find($submission->id);
            }
            abort_unless($submission->status === MeterReadingSubmissionStatus::Pending, 409, 'Yêu cầu đã được xử lý.');
            $contract = Contract::findOrFail($submission->contract_id);
            abort_unless($contract->status === ContractStatus::Active && $contract->user_id === $submission->submitted_by
                && $contract->room_id === $submission->room_id && $submission->getRawOriginal() === $original->getRawOriginal(), 409,
                'Hợp đồng hoặc yêu cầu đã thay đổi. Không gán chỉ số sang người thuê khác.');
            $photo = $this->photo($submission);
            abort_unless(Storage::disk('private')->exists($photo->path), 409, 'Ảnh chỉ số không còn sẵn sàng; cần kiểm tra trước khi duyệt.');
            $reading = $this->readings->storeBatch([$data])->first();
            abort_unless($reading->contract_id === $submission->contract_id, 409, 'Khoảng tiêu thụ không thuộc hợp đồng đã gửi.');
            $submission->status = MeterReadingSubmissionStatus::Approved;
            $submission->reviewed_by = $actor->id;
            $submission->reviewed_at = now();
            $submission->approved_meter_reading_id = $reading->id;
            $submission->save();

            return $this->find($submission->id);
        });
    }

    public function reject(MeterReadingSubmission $original, User $actor, string $reason): MeterReadingSubmission
    {
        return DB::transaction(function () use ($original, $actor, $reason) {
            Room::whereKey($original->room_id)->lockForUpdate()->firstOrFail();
            $submission = MeterReadingSubmission::whereKey($original->id)->lockForUpdate()->firstOrFail();
            abort_unless($actor->fresh()->isActive() && $actor->fresh()->hasRole(UserRole::Admin), 403, 'Bạn không có quyền duyệt.');
            abort_unless($submission->status === MeterReadingSubmissionStatus::Pending, 409, 'Yêu cầu đã được xử lý.');
            $submission->status = MeterReadingSubmissionStatus::Rejected;
            $submission->rejection_reason = $reason;
            $submission->reviewed_by = $actor->id;
            $submission->reviewed_at = now();
            $submission->save();

            return $this->find($submission->id);
        }, 3);
    }

    public function photo(MeterReadingSubmission $submission): Attachment
    {
        return $submission->attachments()->where('collection', Attachment::METER_READING_PHOTO)->where('disk', 'private')->sole();
    }
}
