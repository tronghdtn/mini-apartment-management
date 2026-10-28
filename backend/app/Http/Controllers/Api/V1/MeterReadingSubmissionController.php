<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MeterReadingSubmission\SubmissionRequest;
use App\Http\Resources\MeterReadingSubmissionResource;
use App\Services\MeterReadingSubmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MeterReadingSubmissionController extends Controller
{
    public function __construct(private readonly MeterReadingSubmissionService $submissions) {}

    public function index(SubmissionRequest $request): AnonymousResourceCollection
    {
        return MeterReadingSubmissionResource::collection($this->submissions->paginate($request->user(), $request->validated()));
    }

    public function context(SubmissionRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->submissions->context($request->user())]);
    }

    public function show(SubmissionRequest $request, int $submission): MeterReadingSubmissionResource
    {
        return new MeterReadingSubmissionResource($this->submissions->find($request->submission()->id));
    }

    public function store(SubmissionRequest $request): JsonResponse
    {
        return (new MeterReadingSubmissionResource($this->submissions->store($request->user(), $request->safe()->except('photo'), $request->file('photo'))))
            ->response()->setStatusCode(201);
    }

    public function approve(SubmissionRequest $request, int $submission): MeterReadingSubmissionResource
    {
        return new MeterReadingSubmissionResource($this->submissions->approve($request->submission(), $request->user()));
    }

    public function reject(SubmissionRequest $request, int $submission): MeterReadingSubmissionResource
    {
        return new MeterReadingSubmissionResource($this->submissions->reject($request->submission(), $request->user(), $request->validated('rejection_reason')));
    }

    public function photo(SubmissionRequest $request, int $submission): StreamedResponse
    {
        $photo = $this->submissions->photo($request->submission());
        Gate::authorize('view', $photo);
        abort_unless(Storage::disk('private')->exists($photo->path), 404);

        return Storage::disk('private')->response($photo->path, 'meter-reading-'.$submission.'.'.match ($photo->mime_type) {
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
            default => abort(404),
        }, ['Content-Type' => $photo->mime_type, 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }
}
