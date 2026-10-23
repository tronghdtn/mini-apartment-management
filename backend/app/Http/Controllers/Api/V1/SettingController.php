<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Setting\UpdateDaysSettingRequest;
use App\Http\Resources\SettingResource;
use App\Models\Setting;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class SettingController extends Controller
{
    public function __construct(private readonly SettingService $settings) {}

    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Setting::class);
        $settings = $this->settings->all();
        $missingKeys = array_values(array_diff(array_keys(SettingService::DEFAULT_SETTINGS), $settings->pluck('key')->all()));

        return SettingResource::collection($settings)->additional(['missing_keys' => $missingKeys]);
    }

    public function update(UpdateDaysSettingRequest $request, string $key): JsonResponse
    {
        Gate::authorize('update', Setting::class);

        return (new SettingResource($this->settings->updateDays($key, (int) $request->validated('value'))))
            ->response()->setStatusCode(200);
    }
}
