<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

/** RES-01: tổng quan chỉ đọc của chính cư dân; không khóa hoặc thay đổi bản ghi nghiệp vụ. */
class ResidentOverviewService
{
    public function __construct(private readonly ContractService $contracts, private readonly DebtService $debts) {}

    public function ensureReady(): void
    {
        $this->contracts->ensureReady();
        $this->debts->ensureReady();
    }

    public function summary(User $user): array
    {
        $this->ensureReady();
        $due = $this->contracts->dueWindow();

        // Cùng snapshot đọc như Dashboard; công nợ gồm mọi hợp đồng của chính user, kể cả đã thanh lý/soft-delete.
        return DB::transaction(function () use ($user, $due): array {
            $contract = Contract::with('room.building')->where('user_id', $user->id)
                ->where('status', ContractStatus::Active)->orderBy('id')->first();
            $invoices = $this->debts->outstanding(Invoice::query())
                ->whereHas('contract', fn ($query) => $query->withTrashed()->where('user_id', $user->id))
                ->get(['total_amount', 'paid_amount', 'due_date']);
            // paid_amount chỉ gồm payment confirmed, nên payment pending không làm giảm nợ.
            $overdue = $invoices->filter(fn (Invoice $invoice) => $invoice->due_date !== null
                && $invoice->due_date->format('Y-m-d') < $due['today']);
            $remaining = fn (Invoice $invoice) => Money::remaining($invoice->total_amount, $invoice->paid_amount);

            return [
                'today' => $due['today'],
                'active_contract' => $contract === null ? null : [
                    'contract' => $contract,
                    'due_state' => match (true) {
                        $contract->end_date->format('Y-m-d') < $due['today'] => 'overdue',
                        $contract->end_date->format('Y-m-d') <= $due['expiring_until'] => 'expiring',
                        default => null,
                    },
                    'expiring_warning_days' => $due['expiring_warning_days'],
                ],
                'debt' => [
                    'outstanding_amount' => Money::aggregate($invoices->map($remaining)->all()),
                    'outstanding_invoice_count' => $invoices->count(),
                    'overdue_amount' => Money::aggregate($overdue->map($remaining)->values()->all()),
                    'overdue_invoice_count' => $overdue->count(),
                ],
            ];
        });
    }
}
