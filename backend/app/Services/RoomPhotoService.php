<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\Building;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class RoomPhotoService
{
    public function ensureReady(): void
    {
        abort_unless(Schema::hasTable('attachments'), 503, 'Chức năng ảnh phòng chưa sẵn sàng.');
    }

    public function list(Room $room): Collection
    {
        $this->ensureReady();

        return $room->photos()->get();
    }

    /** @param array<int, UploadedFile> $files */
    public function store(Room $original, User $actor, array $files): Collection
    {
        $this->ensureReady();
        abort_unless(count($files) >= 1 && count($files) <= 20, 422, 'Mỗi lần gửi từ 1 đến 20 ảnh.');
        $paths = [];
        try {
            foreach ($files as $file) {
                $path = $file->store('room-gallery', 'private');
                if ($path === false) {
                    throw new RuntimeException('Không thể lưu ảnh phòng.');
                }
                $paths[] = $path;
            }

            return $this->locked($original, $actor, function (Room $room) use ($files, $paths): Collection {
                $existing = $room->photos()->lockForUpdate()->get();
                abort_if($existing->count() + count($files) > 20, 409, 'Mỗi phòng chỉ lưu tối đa 20 ảnh. Vui lòng tải lại danh sách.');
                $order = (int) ($existing->max('sort_order') ?? 0);
                foreach ($files as $index => $file) {
                    $photo = new Attachment;
                    $photo->attachable_type = $room->getMorphClass();
                    $photo->attachable_id = $room->id;
                    $photo->collection = Attachment::ROOM_GALLERY;
                    $photo->disk = 'private';
                    $photo->path = $paths[$index];
                    $photo->original_name = 'room-photo.'.$file->extension();
                    $photo->mime_type = $file->getMimeType();
                    $photo->size_bytes = $file->getSize();
                    $photo->sort_order = ++$order;
                    $photo->is_cover = false;
                    $photo->save();
                }
                $this->ensureCover($room);

                return $this->list($room);
            });
        } catch (Throwable $failure) {
            foreach ($paths as $path) {
                try {
                    if (! Storage::disk('private')->delete($path)) {
                        throw new RuntimeException('File cleanup failed');
                    }
                } catch (Throwable) {
                    report(new RuntimeException('Không thể dọn tệp ảnh phòng sau thao tác thất bại.'));
                }
            }
            throw $failure;
        }
    }

    public function cover(Room $original, User $actor, int $id, ?int $expectedCover): Collection
    {
        $this->ensureReady();

        return $this->locked($original, $actor, function (Room $room) use ($id, $expectedCover): Collection {
            $photos = $room->photos()->lockForUpdate()->get();
            abort_unless($photos->contains('id', $id), 404);
            $current = $photos->firstWhere('is_cover', true)?->id;
            if ($current !== $id) {
                abort_unless($current === $expectedCover, 409, 'Ảnh bìa đã thay đổi. Vui lòng tải lại.');
                $room->photos()->update(['is_cover' => false]);
                $room->photos()->whereKey($id)->update(['is_cover' => true]);
            }

            return $this->list($room);
        });
    }

    public function remove(Room $original, User $actor, int $id): void
    {
        $this->ensureReady();
        $this->locked($original, $actor, function (Room $room) use ($id): void {
            $photo = $room->photos()->lockForUpdate()->findOrFail($id);
            $path = $photo->path;
            $this->validPath($photo);
            $photo->delete();
            $this->ensureCover($room);
            DB::afterCommit(function () use ($path): void {
                try {
                    if (! Storage::disk('private')->delete($path)) {
                        throw new RuntimeException('File removal failed');
                    }
                } catch (Throwable) {
                    // Metadata đã commit: URL hết hiệu lực; không giả rollback hoặc lộ path.
                    report(new RuntimeException('Không thể dọn tệp ảnh phòng sau khi gỡ metadata.'));
                }
            });
        });
    }

    public function photo(Room $room, int $id): Attachment
    {
        $this->ensureReady();
        $photo = $room->photos()->findOrFail($id);
        $this->validPath($photo);

        return $photo;
    }

    private function validPath(Attachment $photo): void
    {
        abort_unless(preg_match('~^room-gallery/[A-Za-z0-9]{40}\.(jpg|jpeg|png|webp)$~', $photo->path) === 1, 404);
    }

    private function ensureCover(Room $room): void
    {
        $photos = $room->photos()->get();
        if ($photos->isNotEmpty() && ! $photos->contains('is_cover', true)) {
            $photos->first()->is_cover = true;
            $photos->first()->save();
        }
    }

    private function locked(Room $original, User $actor, callable $action): mixed
    {
        return DB::transaction(function () use ($original, $actor, $action) {
            Building::whereKey($original->building_id)->lockForUpdate()->firstOrFail();
            $room = Room::whereKey($original->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor->fresh())->authorize('update', $room);

            return $action($room);
        }, 3);
    }
}
