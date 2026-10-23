<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UtilityPrice\IndexUtilityPriceRequest;
use App\Http\Requests\UtilityPrice\StoreUtilityPriceRequest;
use App\Http\Resources\UtilityPriceResource;
use App\Models\UtilityPrice;
use App\Services\UtilityPriceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class UtilityPriceController extends Controller
{
    public function __construct(private readonly UtilityPriceService $prices) {}

    public function index(IndexUtilityPriceRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', UtilityPrice::class);

        return UtilityPriceResource::collection($this->prices->paginate($request->validated()));
    }

    public function store(StoreUtilityPriceRequest $request): JsonResponse
    {
        Gate::authorize('create', UtilityPrice::class);

        return (new UtilityPriceResource($this->prices->create($request->validated())))->response()->setStatusCode(201);
    }
}
