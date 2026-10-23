<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Service\IndexServiceRequest;
use App\Http\Requests\Service\StoreServiceRequest;
use App\Http\Requests\Service\UpdateServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Services\ServiceCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ServiceController extends Controller
{
    public function __construct(private readonly ServiceCatalogService $services) {}

    public function index(IndexServiceRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Service::class);

        return ServiceResource::collection($this->services->paginate());
    }

    public function show(Service $service): ServiceResource
    {
        Gate::authorize('view', $service);

        return new ServiceResource($service);
    }

    public function store(StoreServiceRequest $request): JsonResponse
    {
        Gate::authorize('create', Service::class);

        return (new ServiceResource($this->services->create($request->validated())))->response()->setStatusCode(201);
    }

    public function update(UpdateServiceRequest $request, Service $service): ServiceResource
    {
        Gate::authorize('update', $service);

        return new ServiceResource($this->services->update($service, $request->validated()));
    }
}
