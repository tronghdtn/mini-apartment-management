<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contract\ClosurePreviewRequest;
use App\Http\Requests\Contract\ConfirmDepositRefundRequest;
use App\Http\Requests\Contract\ContractInspectionRequest;
use App\Http\Requests\Contract\ContractLifecycleRequest;
use App\Http\Requests\Contract\CreateFinalInvoiceRequest;
use App\Http\Requests\Contract\FinalMeterPreviewRequest;
use App\Http\Requests\Contract\IndexContractRequest;
use App\Http\Requests\Contract\StoreContractRequest;
use App\Http\Requests\Contract\TerminateContractRequest;
use App\Http\Requests\Contract\UpdateContractRequest;
use App\Http\Requests\Contract\UpdateDraftServicesRequest;
use App\Http\Resources\ClosurePreviewResource;
use App\Http\Resources\ContractResource;
use App\Http\Resources\ContractSettlementResource;
use App\Http\Resources\InvoiceResource;
use App\Models\Contract;
use App\Services\ContractClosureService;
use App\Services\ContractFinalInvoiceService;
use App\Services\ContractInspectionService;
use App\Services\ContractService;
use App\Services\ContractSettlementService;
use App\Services\ContractTermsService;
use App\Services\FinalMeterReadingPreviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContractController extends Controller
{
    public function __construct(private readonly ContractService $contracts) {}

    public function index(IndexContractRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Contract::class);

        $listing = $this->contracts->listing($request->validated());

        return ContractResource::collection($listing['page'])
            ->additional(['meta' => ['counts' => $listing['counts'], 'due' => $listing['due']]]);
    }

    public function closurePreview(ClosurePreviewRequest $request, string $contract, ContractClosureService $closure): ClosurePreviewResource
    {
        return new ClosurePreviewResource($closure->preview($contract, $request->validated()));
    }

    public function finalMeterPreview(FinalMeterPreviewRequest $request, string $contract, FinalMeterReadingPreviewService $preview): ClosurePreviewResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('view', $model);

        return new ClosurePreviewResource($preview->preview($model, $request->user(), $request->validated()));
    }

    public function createFinalInvoice(CreateFinalInvoiceRequest $request, string $contract, ContractFinalInvoiceService $finalInvoices): JsonResponse
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        $invoice = $finalInvoices->create($model, $request->user(), $request->validated());

        return (new InvoiceResource($invoice))->response()->setStatusCode(201);
    }

    public function recordInspection(ContractInspectionRequest $request, string $contract, ContractInspectionService $inspection): ContractResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);
        $data = $request->safe()->except('photos');

        return new ContractResource($inspection->record($model, $request->user(), $data, $request->file('photos', [])));
    }

    public function inspectionPhoto(Request $request, string $contract, int $attachment, ContractInspectionService $inspection): StreamedResponse
    {
        $photo = $inspection->photo($request->user(), (int) $contract, $attachment);
        abort_unless(Storage::disk('private')->exists($photo->path), 404);
        $extension = match ($photo->mime_type) {
            'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', default => abort(404),
        };

        return Storage::disk('private')->response($photo->path, 'contract-'.$contract.'-attachment-'.$photo->id.'.'.$extension,
            ['Content-Type' => $photo->mime_type, 'Content-Disposition' => 'inline', 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }

    public function show(string $contract): ContractResource
    {
        Gate::authorize('viewAny', Contract::class);
        $model = $this->contracts->find($contract);
        Gate::authorize('view', $model);

        return new ContractResource($model);
    }

    public function store(StoreContractRequest $request): JsonResponse
    {
        Gate::authorize('create', Contract::class);

        return (new ContractResource($this->contracts->create($request->validated())))->response()->setStatusCode(201);
    }

    public function update(UpdateContractRequest $request, string $contract): ContractResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        return new ContractResource($this->contracts->update($model, $request->validated()));
    }

    public function destroy(string $contract): Response
    {
        Gate::authorize('viewAny', Contract::class);
        $model = $this->contracts->find($contract);
        Gate::authorize('delete', $model);
        $this->contracts->delete($model);

        return response()->noContent();
    }

    public function updateServices(UpdateDraftServicesRequest $request, string $contract): ContractResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        return new ContractResource($this->contracts->updateServices($model, $request->validated()));
    }

    public function updateTerms(ContractLifecycleRequest $request, string $contract, ContractTermsService $terms): ContractResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);
        $terms->updateDraft($model, $request->user(), $request->validated());

        return new ContractResource($this->contracts->find($contract));
    }

    public function activationContext(string $contract): JsonResponse
    {
        Gate::authorize('viewAny', Contract::class);
        $model = $this->contracts->find($contract);
        Gate::authorize('view', $model);

        return response()->json(['data' => $this->contracts->activationContext($model)]);
    }

    public function confirmDeposit(ContractLifecycleRequest $request, string $contract): ContractResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        return new ContractResource($this->contracts->confirmDeposit($model, $request->validated()));
    }

    public function activate(ContractLifecycleRequest $request, string $contract): ContractResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        return new ContractResource($this->contracts->activate($model, $request->user(), $request->validated()));
    }

    public function settlementPreview(Request $request, string $contract, ContractSettlementService $settlement): ContractSettlementResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        return new ContractSettlementResource($settlement->preview($model, $request->user()));
    }

    public function terminate(TerminateContractRequest $request, string $contract, ContractSettlementService $settlement): ContractSettlementResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        return new ContractSettlementResource($settlement->terminate($model, $request->user(), $request->validated()));
    }

    public function confirmRefund(ConfirmDepositRefundRequest $request, string $contract, ContractSettlementService $settlement): ContractSettlementResource
    {
        $model = $this->contracts->find($contract);
        Gate::authorize('update', $model);

        return new ContractSettlementResource($settlement->confirmRefund($model, $request->user(), $request->validated()));
    }
}
