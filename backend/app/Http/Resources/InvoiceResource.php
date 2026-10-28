<?php

namespace App\Http\Resources;

use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $admin = $request->user()->hasRole(UserRole::Admin);
        $remaining = $this->status === InvoiceStatus::Cancelled ? 0 : Money::remaining($this->total_amount, $this->paid_amount);

        return ['id' => $this->id, 'invoice_number' => $this->invoice_number, 'contract_id' => $this->contract_id,
            'contract_number' => $this->contract->contract_number, 'tenant_name' => $this->contract->tenant->full_name,
            'room' => ['id' => $this->contract->room_id, 'code' => $this->contract->room->code,
                'building_name' => $this->contract->room->building->name],
            'type' => $this->type->value, 'period' => $this->period->format('Y-m-d'), 'status' => $this->status->value,
            'total_amount' => $this->total_amount, 'paid_amount' => $this->paid_amount, 'outstanding_amount' => $remaining,
            'due_date' => $this->due_date?->format('Y-m-d'), 'issued_at' => $this->issued_at?->toISOString(),
            'is_overdue' => in_array($this->status, [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid], true) && $remaining > 0
                && $this->due_date !== null && $this->due_date->format('Y-m-d') < now(config('app.business_timezone'))->format('Y-m-d'),
            'related_invoice_id' => $this->related_invoice_id, 'cancel_reason' => $this->cancel_reason,
            'revision' => $admin && $this->relationLoaded('items') ? $this->revision() : null,
            'items' => $this->whenLoaded('items', fn () => $this->items->filter(fn ($item) => ! ($item->meta['voided'] ?? false))->values()->map(fn ($item) => [
                'id' => $item->id, 'item_type' => $item->item_type->value, 'description' => $item->description, 'quantity' => $item->quantity,
                'unit_price' => $item->unit_price, 'amount' => $item->amount, 'basis' => $item->meta['basis'] ?? null,
                'calculation' => $item->item_type->value === 'other' ? null : $item->meta,
            ])),
            'manual_history' => $this->when($admin && $this->relationLoaded('items'), fn () => $this->items->filter(fn ($item) => ($item->meta['source'] ?? null) === 'manual')->values()->map(fn ($item) => [
                'id' => $item->id, 'voided' => $item->meta['voided'] ?? false, 'audit' => $item->meta['audit'] ?? [],
            ])),
            'meter_readings' => $this->whenLoaded('meterReadings', fn () => $this->meterReadings->map(fn ($reading) => [
                'id' => $reading->id, 'service' => $reading->service->name, 'period' => $reading->period->format('Y-m-d'),
                'previous_reading' => $reading->previous_reading, 'current_reading' => $reading->current_reading,
                'consumption' => $reading->consumption, 'unit_price' => $reading->unit_price, 'amount' => $reading->amount,
            ]))];
    }
}
