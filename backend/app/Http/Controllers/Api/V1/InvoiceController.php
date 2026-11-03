<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\InvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Services\ContractFinalInvoiceService;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InvoiceController extends Controller
{
    public function __construct(private readonly InvoiceService $invoices) {}

    public function index(InvoiceRequest $request): AnonymousResourceCollection
    {
        return InvoiceResource::collection($this->invoices->paginate($request->user(), $request->validated()));
    }

    public function show(InvoiceRequest $request, int $invoice): InvoiceResource
    {
        return new InvoiceResource($request->invoice());
    }

    public function paymentInstructions(InvoiceRequest $request, int $invoice): JsonResponse
    {
        $request->validated();

        return response()->json(['data' => $this->invoices->paymentInstructions($request->invoice())])
            ->header('Cache-Control', 'no-store, private');
    }

    public function store(InvoiceRequest $request): JsonResponse
    {
        return (new InvoiceResource($this->invoices->createMonthly($request->validated())))->response()->setStatusCode(201);
    }

    public function refresh(InvoiceRequest $request, int $invoice): InvoiceResource
    {
        return new InvoiceResource($this->invoices->refresh($request->invoice(), $request->validated('expected_revision')));
    }

    public function issue(InvoiceRequest $request, int $invoice): InvoiceResource
    {
        return new InvoiceResource($this->invoices->issue($request->invoice(), $request->validated('expected_revision')));
    }

    public function cancel(InvoiceRequest $request, int $invoice): InvoiceResource
    {
        return new InvoiceResource($this->invoices->cancel($request->invoice(), $request->validated()));
    }

    public function reissue(InvoiceRequest $request, int $invoice, ContractFinalInvoiceService $finalInvoices): JsonResponse
    {
        return (new InvoiceResource($finalInvoices->reissue($request->invoice(), $request->user(), $request->validated('expected_revision'))))
            ->response()->setStatusCode(201);
    }

    public function addOther(InvoiceRequest $request, int $invoice): InvoiceResource
    {
        return new InvoiceResource($this->invoices->other($request->invoice(), $request->user(), $request->validated()));
    }

    public function updateOther(InvoiceRequest $request, int $invoice, int $item): InvoiceResource
    {
        return new InvoiceResource($this->invoices->other($request->invoice(), $request->user(), $request->validated(), $item));
    }

    public function removeOther(InvoiceRequest $request, int $invoice, int $item): InvoiceResource
    {
        return new InvoiceResource($this->invoices->other($request->invoice(), $request->user(), $request->validated(), $item, true));
    }
}
