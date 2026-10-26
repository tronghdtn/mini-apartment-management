<?php

namespace App\Services;

use App\Enums\EarlyTerminationFeeType;
use App\Models\Contract;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/** Pure calculation of a signed term snapshot; does not close contracts or issue invoices. */
class ContractTerminationFeeCalculator
{
    public function calculate(Contract $contract, string $handoverDate): int
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/D', $handoverDate)
            || ! checkdate((int) substr($handoverDate, 5, 2), (int) substr($handoverDate, 8, 2), (int) substr($handoverDate, 0, 4))) {
            throw ValidationException::withMessages(['actual_end_date' => 'Ngày bàn giao phải đúng định dạng YYYY-MM-DD và tồn tại.']);
        }
        $handover = CarbonImmutable::parse($handoverDate, config('app.business_timezone'));
        $start = CarbonImmutable::parse($contract->start_date->format('Y-m-d'), config('app.business_timezone'));
        $plannedHandover = CarbonImmutable::parse($contract->end_date->format('Y-m-d'), config('app.business_timezone'))->addDay();
        if ($handover->lessThan($start)) {
            throw ValidationException::withMessages(['actual_end_date' => 'Ngày bàn giao không được trước ngày bắt đầu.']);
        }
        if ($handover->equalTo($start)) {
            abort(409, 'Quy tắc phí nhận và trả cùng ngày chưa được xác nhận (P9).');
        }
        if ($handover->greaterThanOrEqualTo($plannedHandover)) {
            return 0;
        }
        $type = $contract->early_termination_fee_type;
        if ($type === null) {
            throw ValidationException::withMessages(['early_termination_fee_type' => 'Hợp đồng chưa có điều khoản phí trước hạn đã thỏa thuận.']);
        }
        if ($type === EarlyTerminationFeeType::None) {
            if ($contract->early_termination_fee_amount !== null || $contract->early_termination_fee_multiplier !== null) {
                throw ValidationException::withMessages(['early_termination_fee_type' => 'Điều khoản không thu phí không được kèm số tiền hoặc hệ số.']);
            }

            return 0;
        }
        $this->validateFeeSnapshot($contract, $type);
        if ($contract->early_termination_waiver_code !== null) {
            $this->validateWaiverSnapshot($contract);

            return 0;
        }
        if ($contract->early_termination_waived_by !== null || $contract->early_termination_waived_at !== null || $contract->early_termination_waiver_note !== null) {
            throw ValidationException::withMessages(['early_termination_waiver_code' => 'Thông tin xác nhận miễn phí chưa đầy đủ.']);
        }
        try {
            $amount = $type === EarlyTerminationFeeType::Fixed
                ? $contract->early_termination_fee_amount
                : Money::multiply($contract->monthly_rent, $contract->early_termination_fee_multiplier);
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages(['early_termination_fee_multiplier' => 'Số tiền phí vượt giới hạn xử lý an toàn.']);
        }
        if ($amount > 9007199254740991) {
            throw ValidationException::withMessages(['early_termination_fee_amount' => 'Số tiền phí vượt giới hạn xử lý an toàn.']);
        }

        return $amount;
    }

    private function validateFeeSnapshot(Contract $contract, EarlyTerminationFeeType $type): void
    {
        $amount = $contract->early_termination_fee_amount;
        $multiplier = $contract->early_termination_fee_multiplier;
        if (($type === EarlyTerminationFeeType::Fixed && ($amount === null || $amount < 0 || $multiplier !== null))
            || ($type === EarlyTerminationFeeType::RentMultiple && ($amount !== null || $multiplier === null || bccomp($multiplier, '0', 2) <= 0 || bccomp($multiplier, '999.99', 2) > 0))) {
            throw ValidationException::withMessages(['early_termination_fee_type' => 'Snapshot điều khoản phí không hợp lệ.']);
        }
    }

    private function validateWaiverSnapshot(Contract $contract): void
    {
        $code = $contract->early_termination_waiver_code;
        $conditions = $contract->early_termination_waiver_conditions ?? [];
        if (! is_array($conditions)) {
            throw ValidationException::withMessages(['early_termination_waiver_code' => 'Snapshot điều kiện miễn phí không hợp lệ.']);
        }
        $matches = array_filter($conditions, fn ($condition): bool => is_array($condition)
            && ($condition['code'] ?? null) === $code && is_string($condition['description'] ?? null) && trim($condition['description']) !== '');
        if (count($matches) !== 1 || (int) $contract->early_termination_waived_by < 1
            || $contract->early_termination_waived_at === null || trim($contract->early_termination_waiver_note ?? '') === '') {
            throw ValidationException::withMessages(['early_termination_waiver_code' => 'Chỉ miễn toàn bộ khi điều kiện thuộc hợp đồng và có Admin xác nhận cùng căn cứ.']);
        }
    }
}
