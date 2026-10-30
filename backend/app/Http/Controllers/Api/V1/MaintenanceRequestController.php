<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Maintenance\MaintenanceRequestInput;
use App\Http\Resources\MaintenanceRequestResource;
use App\Models\MaintenanceRequest;
use App\Services\MaintenanceRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MaintenanceRequestController extends Controller
{
    public function __construct(private readonly MaintenanceRequestService $requests) {}

    public function index(MaintenanceRequestInput $input): AnonymousResourceCollection
    {
        return MaintenanceRequestResource::collection($this->requests->paginate($input->user(), $input->validated()));
    }

    public function context(MaintenanceRequestInput $input): JsonResponse
    {
        return response()->json(['data' => $this->requests->context($input->user())]);
    }

    public function store(MaintenanceRequestInput $input): JsonResponse
    {
        $request = $this->requests->store($input->user(), $input->safe()->except('photos'), $input->file('photos', []));

        return (new MaintenanceRequestResource($request))->response()->setStatusCode(201);
    }

    public function show(MaintenanceRequestInput $input, MaintenanceRequest $maintenanceRequest): MaintenanceRequestResource
    {
        return new MaintenanceRequestResource($this->requests->find($maintenanceRequest->id));
    }

    public function update(MaintenanceRequestInput $input, MaintenanceRequest $maintenanceRequest): MaintenanceRequestResource
    {
        return new MaintenanceRequestResource($this->requests->update($maintenanceRequest, $input->user(), $input->validated()));
    }

    public function assign(MaintenanceRequestInput $input, MaintenanceRequest $maintenanceRequest): MaintenanceRequestResource
    {
        return new MaintenanceRequestResource($this->requests->assign($maintenanceRequest, $input->user(), $input->validated()));
    }

    public function start(MaintenanceRequestInput $input, MaintenanceRequest $maintenanceRequest): MaintenanceRequestResource
    {
        return new MaintenanceRequestResource($this->requests->start($maintenanceRequest, $input->user()));
    }

    public function resolve(MaintenanceRequestInput $input, MaintenanceRequest $maintenanceRequest): MaintenanceRequestResource
    {
        return new MaintenanceRequestResource($this->requests->resolve($maintenanceRequest, $input->user(), $input->validated('handler_note')));
    }

    public function reject(MaintenanceRequestInput $input, MaintenanceRequest $maintenanceRequest): MaintenanceRequestResource
    {
        return new MaintenanceRequestResource($this->requests->reject($maintenanceRequest, $input->user(), $input->validated('admin_note')));
    }

    public function reopen(MaintenanceRequestInput $input, MaintenanceRequest $maintenanceRequest): MaintenanceRequestResource
    {
        return new MaintenanceRequestResource($this->requests->reopen($maintenanceRequest, $input->user()));
    }

    public function photo(MaintenanceRequestInput $input, MaintenanceRequest $maintenanceRequest, int $attachment): StreamedResponse
    {
        $photo = $this->requests->photo($maintenanceRequest, $attachment);
        Gate::authorize('view', $photo);
        abort_unless(Storage::disk('private')->exists($photo->path), 404);
        $extension = match ($photo->mime_type) {
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', default => abort(404),
        };

        return Storage::disk('private')->response($photo->path, 'maintenance-'.$maintenanceRequest->id.'-'.$photo->id.'.'.$extension,
            ['Content-Type' => $photo->mime_type, 'Content-Disposition' => 'inline', 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }
}
