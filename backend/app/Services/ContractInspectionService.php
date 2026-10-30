<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\InspectionResult;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\ContractService as ContractServiceModel;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ContractInspectionService
{
    public function __construct(private readonly ContractService $contracts) {}

    public function ensureReady(): void
    {
        abort_unless(Schema::hasColumns('contracts', ['inspection_result', 'inspected_by', 'inspected_at', 'inspection_note'])
            && Schema::hasTable('attachments'), 503, 'Kiểm tra tài sản chưa được triển khai đầy đủ trên môi trường này.');
    }

    /** @param array<int, UploadedFile> $photos */
    public function record(Contract $original, User $actor, array $data, array $photos): Contract
    {
        $this->ensureReady();
        $paths = [];

        try {
            foreach ($photos as $photo) {
                $path = $photo->store('contract-inspections/'.$original->id, 'private');
                abort_unless(is_string($path) && $path !== '', 500, 'Không thể lưu ảnh kiểm tra lúc này. Vui lòng thử lại.');
                $paths[] = $path;
            }

            $id = DB::transaction(function () use ($original, $actor, $data, $photos, $paths): int {
                Room::whereKey($original->room_id)->lockForUpdate()->firstOrFail();
                $users = User::whereIn('id', [$original->user_id, $actor->id])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $contract = Contract::whereKey($original->id)->lockForUpdate()->firstOrFail();
                abort_unless($contract->room_id === $original->room_id && $contract->user_id === $original->user_id, 409,
                    'Hợp đồng vừa thay đổi. Vui lòng tải lại.');
                abort_unless($contract->status === ContractStatus::Active, 409, 'Chỉ kiểm tra tài sản cho hợp đồng đang hiệu lực.');
                abort_if(MeterReading::where('contract_id', $contract->id)->where('kind', 'final')->exists(), 409,
                    'Không thể đổi kết quả kiểm kê sau khi đã lưu chỉ số chốt; hóa đơn lập lại phải giữ nguyên căn cứ đã ghi.');
                $admin = $users->get($actor->id);
                abort_unless($admin !== null && $admin->isActive() && $admin->hasRole(UserRole::Admin), 403);
                $contract->setRelation('contractServices', ContractServiceModel::where('contract_id', $contract->id)
                    ->orderBy('id')->lockForUpdate()->get());
                abort_unless(hash_equals($contract->lifecycleRevision(), $data['expected_revision']), 409,
                    'Hợp đồng vừa thay đổi. Vui lòng tải lại trước khi ghi kết quả kiểm tra.');

                $contract->inspection_result = InspectionResult::from($data['inspection_result']);
                $contract->inspected_by = $admin->id;
                $contract->inspected_at = now();
                $contract->inspection_note = $data['inspection_note'] ?? null;
                $contract->save();

                $sortOrder = (int) ($contract->attachments()->where('collection', Attachment::CONTRACT_INSPECTION_PHOTO)->max('sort_order') ?? -1) + 1;
                foreach ($photos as $index => $photo) {
                    $attachment = new Attachment;
                    $attachment->collection = Attachment::CONTRACT_INSPECTION_PHOTO;
                    $attachment->disk = 'private';
                    $attachment->path = $paths[$index];
                    $attachment->original_name = 'contract-'.$contract->id.'-inspection-'.($sortOrder + $index + 1).'.'.$photo->extension();
                    $attachment->mime_type = $photo->getMimeType();
                    $attachment->size_bytes = $photo->getSize();
                    $attachment->sort_order = $sortOrder + $index;
                    $contract->attachments()->save($attachment);
                }

                return $contract->id;
            }, 3);
        } catch (Throwable $failure) {
            foreach ($paths as $path) {
                Storage::disk('private')->delete($path);
            }
            if ($failure instanceof QueryException) {
                report(new RuntimeException('Không thể lưu kết quả kiểm tra tài sản do lỗi CSDL.'));
                abort(500, 'Không thể lưu kết quả kiểm tra lúc này. Vui lòng thử lại sau.');
            }
            throw $failure;
        }

        return $this->contracts->find($id);
    }

    public function photo(User $actor, int $contractId, int $attachmentId): Attachment
    {
        $this->ensureReady();
        $contract = Contract::withTrashed()->findOrFail($contractId);
        if ($actor->hasRole(UserRole::Admin)) {
            abort_unless($actor->isActive() && $actor->can('view', $contract), 403);
        } else {
            abort_unless($actor->isActive() && $actor->can('viewOwnContract', $contract), 404);
        }

        $photo = $contract->attachments()->whereKey($attachmentId)->whereIn('collection', [
            Attachment::CONTRACT_INSPECTION_PHOTO, Attachment::CONTRACT_DAMAGE_PHOTO, Attachment::CONTRACT_WAIVER_EVIDENCE,
        ])
            ->where('disk', 'private')->firstOrFail();
        abort_unless($actor->can('view', $photo), 403);

        return $photo;
    }
}
