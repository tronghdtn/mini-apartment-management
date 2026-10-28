<?php

namespace App\Http\Resources;

use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $invoice = $this->invoice;

        return ['id' => $this->id, 'invoice_id' => $this->invoice_id, 'amount' => $this->amount, 'method' => $this->method->value,
            'status' => $this->status->value, 'receipt_number' => $this->receipt_number, 'created_at' => $this->created_at->toISOString(),
            'reviewed_at' => $this->reviewed_at?->toISOString(), 'reviewed_by' => $this->reviewed_by, 'reject_reason' => $this->reject_reason,
            'revision' => $request->user()->hasRole(UserRole::Admin) ? $this->revision() : null,
            'has_proof' => $this->attachments->contains(fn ($photo) => $photo->collection === Attachment::PAYMENT_PROOF && $photo->disk === 'private'),
            'invoice' => ['id' => $invoice->id, 'invoice_number' => $invoice->invoice_number, 'contract_id' => $invoice->contract_id,
                'room_code' => $invoice->contract->room->code, 'building_name' => $invoice->contract->room->building->name,
                'tenant_name' => $invoice->contract->tenant->full_name, 'status' => $invoice->status->value,
                'total_amount' => $invoice->total_amount, 'paid_amount' => $invoice->paid_amount,
                'outstanding_amount' => $invoice->status === InvoiceStatus::Cancelled ? 0 : Money::remaining($invoice->total_amount, $invoice->paid_amount)]];
    }
}
