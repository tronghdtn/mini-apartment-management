<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Room\IndexRoomRequest;
use App\Http\Requests\Room\StoreRoomRequest;
use App\Http\Requests\Room\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use App\Services\RoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class RoomController extends Controller
{
    public function __construct(private readonly RoomService $rooms) {}

    public function index(IndexRoomRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Room::class);

        return RoomResource::collection($this->rooms->paginate($request->validated()));
    }

    public function show(string $room): RoomResource
    {
        Gate::authorize('viewAny', Room::class);
        $model = $this->rooms->find($room);
        Gate::authorize('view', $model);

        return new RoomResource($model);
    }

    public function store(StoreRoomRequest $request): JsonResponse
    {
        Gate::authorize('create', Room::class);

        return (new RoomResource($this->rooms->create($request->validated())))->response()->setStatusCode(201);
    }

    public function update(UpdateRoomRequest $request, string $room): RoomResource
    {
        $model = $this->rooms->find($room);
        Gate::authorize('update', $model);

        return new RoomResource($this->rooms->update($model, $request->validated()));
    }
}
