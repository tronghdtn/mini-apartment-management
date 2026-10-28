<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\PaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    public function index(PaymentRequest $request): AnonymousResourceCollection
    {
        return PaymentResource::collection($this->payments->paginate($request->user(), $request->validated()));
    }

    public function show(PaymentRequest $request, int $payment): PaymentResource
    {
        return new PaymentResource($request->payment());
    }

    public function store(PaymentRequest $request, int $invoice): JsonResponse
    {
        return (new PaymentResource($this->payments->store($request->invoice(), $request->user(), $request->safe()->except('proof'), $request->file('proof'))))
            ->response()->setStatusCode(201);
    }

    public function confirm(PaymentRequest $request, int $payment): PaymentResource
    {
        return new PaymentResource($this->payments->confirm($request->payment(), $request->user(), $request->validated()));
    }

    public function reject(PaymentRequest $request, int $payment): PaymentResource
    {
        return new PaymentResource($this->payments->reject($request->payment(), $request->user(), $request->validated()));
    }

    public function proof(PaymentRequest $request, int $payment): StreamedResponse
    {
        $photo = $this->payments->proof($request->payment());
        Gate::authorize('view', $photo);
        abort_unless(Storage::disk('private')->exists($photo->path), 404);

        return Storage::disk('private')->response($photo->path, 'payment-'.$payment.'.'.match ($photo->mime_type) {
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', default => abort(404),
        }, ['Content-Type' => $photo->mime_type, 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }
}
