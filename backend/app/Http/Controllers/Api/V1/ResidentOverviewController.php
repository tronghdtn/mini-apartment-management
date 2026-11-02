<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResidentOverview\ResidentOverviewRequest;
use App\Http\Resources\ResidentOverviewResource;
use App\Services\ResidentOverviewService;
use Illuminate\Http\JsonResponse;

class ResidentOverviewController extends Controller
{
    public function __construct(private readonly ResidentOverviewService $overview) {}

    public function show(ResidentOverviewRequest $request): JsonResponse
    {
        $request->validated();

        return (new ResidentOverviewResource($this->overview->summary($request->user())))->response()
            ->header('Cache-Control', 'no-store, private');
    }
}
