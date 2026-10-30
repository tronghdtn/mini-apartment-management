<?php

namespace App\Services;

use App\Enums\ContractClosureReason;
use App\Enums\ContractStatus;
use App\Models\Contract;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/** Read-only assessment. Final meters, inspection, invoice and deposit settlement remain separate steps. */
class ContractClosureService
{
    public function __construct(private readonly ContractService $contracts, private readonly ContractTerminationFeeCalculator $fees) {}

    public function preview(string $id, array $data): array
    {
        $this->contracts->ensureReady();
        abort_unless(Schema::hasColumn('contracts', 'early_termination_fee_type'), 503, 'Điều khoản hợp đồng chưa sẵn sàng trên môi trường này.');
        $contract = $this->contracts->find($id);

        return $this->assess($contract, $data);
    }

    /** Reuses the same read-only date/fee rules with a contract already locked by a caller. */
    public function assess(Contract $contract, array $data): array
    {
        abort_unless($contract->status === ContractStatus::Active && $contract->activated_at !== null && ! $contract->trashed(),
            409, 'Chỉ xem trước bàn giao cho hợp đồng đang hiệu lực.');
        abort_unless(hash_equals($contract->lifecycleRevision(), $data['expected_revision']), 409, 'Hợp đồng vừa thay đổi. Vui lòng tải lại.');
        $date = $data['actual_end_date'];
        $start = $contract->start_date->format('Y-m-d');
        if ($date < $start) {
            throw ValidationException::withMessages(['actual_end_date' => 'Ngày bàn giao không được trước ngày bắt đầu.']);
        }
        $planned = CarbonImmutable::parse($contract->end_date->format('Y-m-d'))->addDay()->format('Y-m-d');
        $reason = match (true) {
            $date === $start => ContractClosureReason::SameDay,
            $date < $planned => ContractClosureReason::EarlyTermination,
            $date === $planned => ContractClosureReason::OnTime,
            default => ContractClosureReason::OverdueReturn,
        };
        $note = trim($data['closure_note'] ?? '');
        if ($reason !== ContractClosureReason::OnTime && $note === '') {
            throw ValidationException::withMessages(['closure_note' => 'Cần giải thích lý do bàn giao cùng ngày, trước hạn hoặc quá hạn.']);
        }

        return [
            'contract_id' => $contract->id,
            'contract_revision' => $contract->lifecycleRevision(),
            'actual_end_date' => $date,
            'planned_handover_date' => $planned,
            'closure_reason' => $reason->value,
            'early_termination_fee' => $this->fees->calculate($contract, $date),
            'is_preview' => true,
        ];
    }
}
