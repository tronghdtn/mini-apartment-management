<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Amenity\StoreAmenityRequest;
use App\Http\Requests\Amenity\UpdateAmenityRequest;
use App\Http\Resources\AmenityResource;
use App\Models\Amenity;
use App\Services\AmenityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class AmenityController extends Controller
{
    public function __construct(private readonly AmenityService $amenities) {}

    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Amenity::class);

        return AmenityResource::collection($this->amenities->paginate());
    }

    public function show(Amenity $amenity): AmenityResource
    {
        Gate::authorize('view', $amenity);

        return new AmenityResource($amenity);
    }

    public function store(StoreAmenityRequest $request): JsonResponse
    {
        Gate::authorize('create', Amenity::class);

        return (new AmenityResource($this->amenities->create($request->validated())))->response()->setStatusCode(201);
    }

    public function update(UpdateAmenityRequest $request, Amenity $amenity): AmenityResource
    {
        Gate::authorize('update', $amenity);

        return new AmenityResource($this->amenities->update($amenity, $request->validated()));
    }

    public function destroy(Amenity $amenity): Response
    {
        Gate::authorize('delete', $amenity);
        $this->amenities->archive($amenity);

        return response()->noContent();
    }
}
