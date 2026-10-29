<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Debt\DebtRequest;
use App\Http\Resources\DebtReportResource;
use App\Services\DebtService;
use Illuminate\Http\JsonResponse;

class DebtController extends Controller
{
    public function __construct(private readonly DebtService $debts) {}

    public function index(DebtRequest $request): JsonResponse
    {
        $page = $this->debts->paginate($request->validated());
        $response = DebtReportResource::collection($page)->response()->getData(true);
        $response['summary'] = $this->debts->summary();

        return response()->json($response);
    }
}
