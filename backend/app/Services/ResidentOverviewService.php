<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Models\Contract;
use App\Models\User;
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
                'debt' => $this->debts->userSummary($user->id, $due['today']),
            ];
        });
    }
}
