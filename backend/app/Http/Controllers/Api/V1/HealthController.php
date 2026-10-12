<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\HealthStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\HealthResource;
use App\Services\HealthCheckService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class HealthController extends Controller
{
    public function __construct(private readonly HealthCheckService $healthCheck) {}

    public function __invoke(): JsonResponse
    {
        $result = $this->healthCheck->check();

        return (new HealthResource($result))
            ->response()
            ->setStatusCode($result['status'] === HealthStatus::Ok
                ? Response::HTTP_OK
                : Response::HTTP_SERVICE_UNAVAILABLE);
    }
}
