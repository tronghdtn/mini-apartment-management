<?php

namespace App\Http\Resources;

use App\Models\Contract;
use App\Services\DebtService;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Contract */
class DebtReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $today = app(DebtService::class)->today();
        $invoices = $this->invoices->map(function ($invoice) use ($today) {
            $amount = Money::remaining($invoice->total_amount, $invoice->paid_amount);
            $overdue = $amount > 0 && $invoice->due_date !== null && $invoice->due_date->format('Y-m-d') < $today;

            return [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'type' => $invoice->type->value,
                'period' => $invoice->period->format('Y-m-d'),
                'status' => $invoice->status->value,
                'due_date' => $invoice->due_date?->format('Y-m-d'),
                'total_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->paid_amount,
                'outstanding_amount' => $amount,
                'is_overdue' => $overdue,
            ];
        });
        $overdueInvoices = $invoices->filter(fn (array $invoice) => $invoice['is_overdue']);
        $total = '0';
        $overdueTotal = '0';
        foreach ($invoices as $invoice) {
            $total = bcadd($total, (string) $invoice['outstanding_amount'], 0);
            if ($invoice['is_overdue']) {
                $overdueTotal = bcadd($overdueTotal, (string) $invoice['outstanding_amount'], 0);
            }
        }

        return [
            'contract_id' => $this->id,
            'contract_number' => $this->contract_number,
            'contract_status' => $this->status->value,
            'tenant' => ['id' => $this->user_id, 'full_name' => $this->tenant->full_name],
            'room' => ['id' => $this->room_id, 'code' => $this->room->code, 'building_name' => $this->room->building->name],
            'outstanding_amount' => $total,
            'overdue_amount' => $overdueTotal,
            'invoice_count' => $invoices->count(),
            'overdue_invoice_count' => $overdueInvoices->count(),
            'oldest_overdue_due_date' => $overdueInvoices->min('due_date'),
            'invoices' => $invoices->values()->all(),
        ];
    }
}
