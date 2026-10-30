<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contract\ResidentContractRequest;
use App\Http\Resources\ResidentContractResource;
use App\Services\ResidentContractService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ResidentContractController extends Controller
{
    public function __construct(private readonly ResidentContractService $contracts) {}

    public function index(ResidentContractRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $query = $this->contracts->query($request->user());
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return ResidentContractResource::collection($query->orderByDesc('id')->paginate(20)->withQueryString());
    }

    public function show(ResidentContractRequest $request, int $contract): ResidentContractResource
    {
        $item = $this->contracts->detail($request->user(), $contract);
        Gate::authorize('viewOwnContract', $item);

        return new ResidentContractResource($item);
    }
}
