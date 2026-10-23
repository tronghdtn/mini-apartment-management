<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AmenityAssignment\UpdateAmenityAssignmentRequest;
use App\Http\Resources\AmenityAssignmentResource;
use App\Models\Building;
use App\Models\Room;
use App\Services\AmenityAssignmentService;
use Illuminate\Support\Facades\Gate;

class AmenityAssignmentController extends Controller
{
    public function __construct(private readonly AmenityAssignmentService $assignments) {}

    public function buildingIndex(string $building): AmenityAssignmentResource
    {
        Gate::authorize('viewAny', Building::class);
        $target = $this->assignments->findBuilding($building);
        Gate::authorize('view', $target);

        return new AmenityAssignmentResource($this->assignments->forBuilding($target));
    }

    public function buildingUpdate(UpdateAmenityAssignmentRequest $request, string $building): AmenityAssignmentResource
    {
        Gate::authorize('update', $request->target());

        return new AmenityAssignmentResource($this->assignments->update($request->target(), $request->validated()['amenity_ids']));
    }

    public function roomIndex(string $room): AmenityAssignmentResource
    {
        Gate::authorize('viewAny', Room::class);
        $target = $this->assignments->findRoom($room);
        Gate::authorize('view', $target);

        return new AmenityAssignmentResource($this->assignments->forRoom($target));
    }

    public function roomUpdate(UpdateAmenityAssignmentRequest $request, string $room): AmenityAssignmentResource
    {
        Gate::authorize('update', $request->target());

        return new AmenityAssignmentResource($this->assignments->update($request->target(), $request->validated()['amenity_ids']));
    }
}
