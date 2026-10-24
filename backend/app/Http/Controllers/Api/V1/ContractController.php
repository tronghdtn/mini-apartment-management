<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contract\IndexContractRequest;
use App\Http\Requests\Contract\StoreContractRequest;
use App\Http\Requests\Contract\UpdateContractRequest;
use App\Http\Requests\Contract\UpdateDraftServicesRequest;
use App\Http\Resources\ContractResource;
use App\Models\Contract;
use App\Services\ContractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ContractController extends Controller
{
    public function __construct(private readonly ContractService $contracts) {}

    public function index(IndexContractRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Contract::class);

        return ContractResource::collection($this->contracts->paginate($request->validated()));
    }

    public function show(string $contract): ContractResource
    {
        Gate::authorize('viewAny', Contract::class);
        $model = $this->contracts->find($contract);
        Gate::authorize('view', $model);

        return new ContractResource($model);
    }

    public function store(StoreContractRequest $request): JsonResponse
    {
        Gate::authorize('create', Contract::class);

        return (new ContractResource($this->contracts->create($request->validated())))->response()->setStatusCode(201);
    }

    public function update(UpdateContractRequest $request, string $contract): ContractResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        return new ContractResource($this->contracts->update($model, $request->validated()));
    }

    public function destroy(string $contract): Response
    {
        Gate::authorize('viewAny', Contract::class);
        $model = $this->contracts->find($contract);
        Gate::authorize('delete', $model);
        $this->contracts->delete($model);

        return response()->noContent();
    }

    public function updateServices(UpdateDraftServicesRequest $request, string $contract): ContractResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        return new ContractResource($this->contracts->updateDraftServices($model, $request->validated()));
    }
}
