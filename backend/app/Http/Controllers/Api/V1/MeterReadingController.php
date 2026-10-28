<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MeterReading\MeterReadingRequest;
use App\Http\Resources\MeterReadingResource;
use App\Models\MeterReading;
use App\Models\Room;
use App\Services\MeterReadingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class MeterReadingController extends Controller
{
    public function __construct(private readonly MeterReadingService $readings) {}

    public function index(MeterReadingRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', MeterReading::class);

        return MeterReadingResource::collection($this->readings->paginate($request->validated()));
    }

    public function context(MeterReadingRequest $request, Room $room): JsonResponse
    {
        Gate::authorize('viewAny', MeterReading::class);

        return response()->json(['data' => $this->readings->context($room->id, $request->validated())]);
    }

    public function store(MeterReadingRequest $request): JsonResponse
    {
        Gate::authorize('create', MeterReading::class);

        return MeterReadingResource::collection($this->readings->storeBatch($request->validated('readings')))->response()->setStatusCode(201);
    }
}
