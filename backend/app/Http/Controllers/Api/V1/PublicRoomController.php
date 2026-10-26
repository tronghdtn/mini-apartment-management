<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Room\IndexPublicRoomRequest;
use App\Http\Resources\PublicRoomFiltersResource;
use App\Http\Resources\PublicRoomResource;
use App\Models\Room;
use App\Services\PublicRoomService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class PublicRoomController extends Controller
{
    public function __construct(private readonly PublicRoomService $rooms) {}

    public function index(IndexPublicRoomRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewPublicAny', Room::class);

        return PublicRoomResource::collection($this->rooms->paginate($request->validated()));
    }

    public function show(string $room): PublicRoomResource
    {
        $model = $this->rooms->find($room);
        Gate::authorize('viewPublic', $model);

        return new PublicRoomResource($model);
    }

    public function filters(): PublicRoomFiltersResource
    {
        Gate::authorize('viewPublicAny', Room::class);

        return new PublicRoomFiltersResource($this->rooms->filterOptions());
    }
}
