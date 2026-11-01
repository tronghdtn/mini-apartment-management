<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contract\ContractOccupantRequest;
use App\Http\Resources\ContractOccupantsResource;
use App\Services\ContractOccupantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ContractOccupantController extends Controller
{
    public function __construct(private readonly ContractOccupantService $occupants) {}

    public function index(ContractOccupantRequest $request, string $contract): ContractOccupantsResource
    {
        return new ContractOccupantsResource($this->occupants->read($contract, $request->user()));
    }

    public function store(ContractOccupantRequest $request, string $contract): JsonResponse
    {
        return (new ContractOccupantsResource($this->occupants->store($contract, $request->user(), $request->validated())))
            ->response()->setStatusCode(201);
    }

    public function update(ContractOccupantRequest $request, string $contract, int $occupant): ContractOccupantsResource
    {
        return new ContractOccupantsResource($this->occupants->update($contract, $request->user(), $occupant, $request->validated()));
    }

    public function destroy(ContractOccupantRequest $request, string $contract, int $occupant): Response
    {
        $this->occupants->remove($contract, $request->user(), $occupant, $request->validated('expected_revision'));

        return response()->noContent();
    }
}
