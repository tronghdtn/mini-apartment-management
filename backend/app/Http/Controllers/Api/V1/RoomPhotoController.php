<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Room\RoomPhotoRequest;
use App\Http\Resources\RoomPhotoResource;
use App\Models\Room;
use App\Services\RoomPhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RoomPhotoController extends Controller
{
    public function __construct(private readonly RoomPhotoService $photos) {}

    public function index(RoomPhotoRequest $request, Room $room): AnonymousResourceCollection
    {
        return RoomPhotoResource::collection($this->photos->list($room));
    }

    public function store(RoomPhotoRequest $request, Room $room): JsonResponse
    {
        $request->validated();

        return RoomPhotoResource::collection($this->photos->store($room, $request->user(), $request->file('photos')))
            ->response()->setStatusCode(201);
    }

    public function cover(RoomPhotoRequest $request, Room $room, int $photo): AnonymousResourceCollection
    {
        $data = $request->validated();

        return RoomPhotoResource::collection($this->photos->cover($room, $request->user(), $photo,
            $data['expected_cover_id'] === null ? null : (int) $data['expected_cover_id']));
    }

    public function destroy(RoomPhotoRequest $request, Room $room, int $photo): Response
    {
        $this->photos->remove($room, $request->user(), $photo);

        return response()->noContent();
    }

    public function content(RoomPhotoRequest $request, Room $room, int $photo): StreamedResponse
    {
        return $this->image($room, $photo, false);
    }

    public function publicContent(int $room, int $photo): StreamedResponse
    {
        $visible = Room::publicAvailable()->with('building:id,status')->findOrFail($room);
        Gate::authorize('viewPublic', $visible);

        return $this->image($visible, $photo, true);
    }

    private function image(Room $room, int $id, bool $public): StreamedResponse
    {
        $photo = $this->photos->photo($room, $id);
        if (! $public) {
            Gate::authorize('view', $photo);
        }
        $extension = match ($photo->mime_type) {
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', default => abort(404),
        };
        abort_unless(Storage::disk('private')->exists($photo->path), 404);

        return Storage::disk('private')->response($photo->path, 'room-'.$room->id.'-'.$photo->id.'.'.$extension,
            ['Content-Type' => $photo->mime_type, 'Content-Disposition' => 'inline',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => $public ? 'private, max-age=3600' : 'private, no-store']);
    }
}
