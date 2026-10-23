<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Building\StoreBuildingRequest;
use App\Http\Requests\Building\UpdateBuildingRequest;
use App\Http\Resources\BuildingResource;
use App\Models\Building;
use App\Services\BuildingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class BuildingController extends Controller
{
    public function __construct(private readonly BuildingService $buildings) {}

    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Building::class);

        return BuildingResource::collection($this->buildings->paginate());
    }

    public function show(Building $building): BuildingResource
    {
        Gate::authorize('view', $building);

        return new BuildingResource($building);
    }

    public function store(StoreBuildingRequest $request): JsonResponse
    {
        Gate::authorize('create', Building::class);

        return (new BuildingResource($this->buildings->create($request->validated())))->response()->setStatusCode(201);
    }

    public function update(UpdateBuildingRequest $request, Building $building): BuildingResource
    {
        Gate::authorize('update', $building);

        return new BuildingResource($this->buildings->update($building, $request->validated()));
    }
}
