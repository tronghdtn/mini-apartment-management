<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\DashboardRequest;
use App\Http\Resources\DashboardResource;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboard) {}

    public function show(DashboardRequest $request): JsonResponse
    {
        $request->validated();

        return (new DashboardResource($this->dashboard->summary()))->response()
            ->header('Cache-Control', 'no-store, private');
    }
}
