<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Enums\MeterReadingKind;
use App\Enums\ServiceBillingType;
use App\Models\Contract;
use App\Models\ContractService;
use App\Models\Invoice;
use App\Models\MeterReading;
use App\Models\Service;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/** Builds immutable source snapshots for a final invoice draft from locked inputs. */
class FinalInvoiceCalculationService
{
    /**
     * @param  Collection<int, ContractService>  $subscriptions
     * @param  Collection<int, MeterReading>  $readings
     * @param  Collection<int, Invoice>  $invoices
     * @param  array<int, array<string, mixed>>  $finalReadings
     * @param  array<int, array<string, mixed>>  $damages
     * @return array{items: array<int, array<string, mixed>>, amount: int, refund_outside_system_amount: int}
     */
    public function calculate(Contract $contract, string $actualEndDate, string $period, Collection $subscriptions,
        Collection $readings, Collection $invoices, array $finalReadings, int $terminationFee, array $damages, ?int $invoiceId = null, int $manualAmount = 0): array
    {
        $finalCodes = array_column($finalReadings, 'service_code');
        sort($finalCodes);
        if ($finalCodes !== [Service::CODE_ELECTRICITY, Service::CODE_WATER]) {
            throw ValidationException::withMessages(['actual_end_date' => 'Cần đúng một snapshot chỉ số chốt cho Điện và Nước.']);
        }
        if ($terminationFee < 0 || $terminationFee > Money::MAX_VND) {
            throw ValidationException::withMessages(['actual_end_date' => 'Phí chấm dứt không hợp lệ.']);
        }
        $items = [];
        $discounts = [];
        $meterIds = [];
        // Cancelled history must never overwrite the live invoice of the same period.
        $monthlyByPeriod = $invoices->where('type', InvoiceType::Monthly)->where('status', '!=', InvoiceStatus::Cancelled)
            ->keyBy(fn (Invoice $invoice) => $invoice->period->format('Y-m-d'));
        $start = CarbonImmutable::parse($contract->start_date->format('Y-m-d'))->startOfMonth();
        $last = CarbonImmutable::parse($period);

        while ($start->lessThanOrEqualTo($last)) {
            $month = $start->format('Y-m-d');
            $monthly = $monthlyByPeriod->get($month);
            if ($monthly && $monthly->status === InvoiceStatus::Draft) {
                abort(409, 'Cần hủy hoặc phát hành hóa đơn tháng nháp trước khi lập hóa đơn tất toán.');
            }
            if ($monthly && $monthly->status !== InvoiceStatus::Cancelled) {
                if ($month === $period) {
                    $discounts = $this->unusedPeriodDiscounts($monthly, $actualEndDate, $period);
                }
            } else {
                array_push($items, ...$this->rentAndServices($contract, $actualEndDate, $month, $subscriptions));
            }
            $start = $start->addMonthNoOverflow();
        }

        foreach ($readings->where('kind', MeterReadingKind::Periodic)->where('contract_id', $contract->id)->sortBy('id') as $reading) {
            if ($reading->period->format('Y-m-d') > $period) {
                abort(409, 'Có chỉ số định kỳ sau kỳ bàn giao; không lập hóa đơn tất toán.');
            }
            if ($reading->invoice_id !== null && $reading->invoice_id !== $invoiceId) {
                continue;
            }
            $meterInvoicePeriod = CarbonImmutable::parse($reading->period->format('Y-m-d'))->addMonthNoOverflow()->format('Y-m-d');
            $meterInvoice = $monthlyByPeriod->get($meterInvoicePeriod);
            if ($meterInvoice && $meterInvoice->status !== InvoiceStatus::Cancelled) {
                abort(409, 'Chỉ số định kỳ chưa liên kết hóa đơn đã phát hành; cần đối chiếu để tránh thu trùng.');
            }
            if ($reading->room_id !== $contract->room_id || ! $reading->service?->isMetered()
                || ! in_array($reading->service?->code, [Service::CODE_ELECTRICITY, Service::CODE_WATER], true)
                || $reading->unit_price < 1 || $reading->unit_price > Money::MAX_VND
                || bccomp($reading->current_reading, $reading->previous_reading, 2) < 0
                || bccomp(bcsub($reading->current_reading, $reading->previous_reading, 2), $reading->consumption, 2) !== 0
                || Money::meterAmount($reading->consumption, $reading->unit_price) !== $reading->amount) {
                throw ValidationException::withMessages(['actual_end_date' => 'Snapshot chỉ số định kỳ không nhất quán; cần đối chiếu.']);
            }
            $meterIds[] = $reading->id;
            $this->meterLine($items, $reading, $reading->period->format('Y-m-d'), $reading->service?->code);
        }

        foreach ($finalReadings as $reading) {
            if (! is_string($reading['consumption']) || ! is_string($reading['previous_reading']) || ! is_string($reading['current_reading'])
                || ! is_int($reading['unit_price']) || $reading['unit_price'] < 1 || $reading['unit_price'] > Money::MAX_VND
                || bccomp($reading['current_reading'], $reading['previous_reading'], 2) < 0
                || bccomp(bcsub($reading['current_reading'], $reading['previous_reading'], 2), $reading['consumption'], 2) !== 0
                || Money::meterAmount($reading['consumption'], $reading['unit_price']) !== $reading['amount']) {
                throw ValidationException::withMessages(['actual_end_date' => 'Snapshot chỉ số chốt không nhất quán.']);
            }
            if (bccomp($reading['consumption'], '0', 2) === 0) {
                $meterIds[] = $reading['id'];

                continue;
            }
            $meterIds[] = $reading['id'];
            $items[] = $this->line($reading['service_code'] === Service::CODE_ELECTRICITY ? 'electricity' : 'water',
                $reading['service_name'].' kỳ '.CarbonImmutable::parse($period)->format('m/Y'), $reading['consumption'],
                $reading['unit_price'], $reading['amount'], ['source' => 'generated', 'period' => $period,
                    'meter_reading_id' => $reading['id'], 'previous_reading' => $reading['previous_reading'],
                    'current_reading' => $reading['current_reading'], 'reading_date' => $actualEndDate,
                    'service_code' => $reading['service_code'], 'unit' => $reading['unit']]);
        }

        if ($terminationFee > 0) {
            $items[] = $this->line('termination_fee', 'Phí chấm dứt trước hạn theo điều khoản đã ký', '1.00', $terminationFee,
                $terminationFee, ['source' => 'generated', 'actual_end_date' => $actualEndDate]);
        }
        foreach ($damages as $damage) {
            if (trim($damage['description']) === '' || trim($damage['reason']) === '' || trim($damage['basis']) === ''
                || $damage['amount'] < 1 || $damage['amount'] > Money::MAX_VND || empty($damage['attachment_ids'])) {
                throw ValidationException::withMessages(['actual_end_date' => 'Mỗi hạng mục bồi thường cần tên, lý do, căn cứ, số tiền và ảnh private.']);
            }
            $items[] = $this->line('damage', $damage['description'], '1.00', $damage['amount'], $damage['amount'], [
                'source' => 'generated', 'reason' => $damage['reason'], 'basis' => $damage['basis'],
                'attachment_ids' => $damage['attachment_ids'],
            ]);
        }

        $positive = Money::sum(array_column($items, 'amount'));
        if ($manualAmount < 0 || $manualAmount > Money::MAX_VND) {
            throw ValidationException::withMessages(['actual_end_date' => 'Tổng khoản khác không hợp lệ.']);
        }
        $discountBudget = Money::sum([$positive, $manualAmount]);
        $availableBudget = $discountBudget;
        $requestedDiscount = Money::sum(array_column($discounts, 'requested_amount'));
        foreach ($discounts as $discount) {
            $amount = min($discount['requested_amount'], $discountBudget);
            $discountBudget -= $amount;
            if ($amount > 0) {
                $items[] = $this->line('discount', $discount['description'], $discount['quantity'], $discount['unit_price'], -$amount,
                    [...$discount['meta'], 'applied_amount' => $amount]);
            }
        }

        $refund = max(0, $requestedDiscount - ($availableBudget - $discountBudget));
        $total = Money::sum(array_column($items, 'amount'));
        if (Money::sum([$total, $manualAmount]) < 0) {
            throw ValidationException::withMessages(['actual_end_date' => 'Tổng hóa đơn tất toán không được âm.']);
        }

        return ['items' => $items, 'meter_ids' => $meterIds, 'amount' => $total, 'refund_outside_system_amount' => $refund];
    }

    /** @return array<int, array<string, mixed>> */
    private function rentAndServices(Contract $contract, string $actualEndDate, string $period, Collection $subscriptions): array
    {
        $month = CarbonImmutable::parse($period);
        $monthEnd = $month->addMonthNoOverflow()->format('Y-m-d');
        $end = min($actualEndDate, $monthEnd);
        $rentDays = $this->days($period, $end, $contract->start_date->format('Y-m-d'));
        $items = [];
        if ($rentDays > 0) {
            $items[] = $this->line('rent', 'Tiền phòng '.CarbonImmutable::parse($period)->format('m/Y'), '1.00',
                $contract->monthly_rent, Money::prorate($contract->monthly_rent, '1.00', $rentDays, $month->daysInMonth),
                ['source' => 'generated', 'period' => $period, 'active_days' => $rentDays, 'days_in_month' => $month->daysInMonth,
                    'start_date' => max($period, $contract->start_date->format('Y-m-d')), 'end_date_exclusive' => $end]);
        }

        foreach ($subscriptions->sortBy('id') as $subscription) {
            $service = $subscription->service;
            if ($service->isMetered()) {
                continue;
            }
            $serviceStart = max($contract->start_date->format('Y-m-d'), $subscription->start_date->format('Y-m-d'));
            $serviceEnd = min($actualEndDate, $subscription->end_date?->addDay()->format('Y-m-d') ?? $actualEndDate);
            $activeDays = $this->days($period, min($serviceEnd, $monthEnd), $serviceStart);
            if ($activeDays < 1) {
                continue;
            }
            if ($subscription->unit_price === null || $subscription->unit_price < 0 || bccomp($subscription->quantity, '0', 2) <= 0
                || ($service->billing_type === ServiceBillingType::PerRoom && bccomp($subscription->quantity, '1', 2) !== 0)) {
                throw ValidationException::withMessages(['actual_end_date' => 'Snapshot dịch vụ hợp đồng không hợp lệ.']);
            }
            $items[] = $this->line('service', $service->name.' '.CarbonImmutable::parse($period)->format('m/Y'),
                $subscription->quantity, $subscription->unit_price,
                Money::prorate($subscription->unit_price, $subscription->quantity, $activeDays, $month->daysInMonth),
                ['source' => 'generated', 'period' => $period, 'contract_service_id' => $subscription->id,
                    'service_id' => $service->id, 'billing_type' => $service->billing_type->value, 'unit' => $service->unit,
                    'active_days' => $activeDays, 'days_in_month' => $month->daysInMonth, 'start_date' => $serviceStart,
                    'end_date_exclusive' => min($serviceEnd, $monthEnd)]);
        }

        return $items;
    }

    /** @return array<int, array<string, mixed>> */
    private function unusedPeriodDiscounts(Invoice $monthly, string $actualEndDate, string $period): array
    {
        $month = CarbonImmutable::parse($period);
        $monthEnd = $month->addMonthNoOverflow()->format('Y-m-d');
        $discounts = [];
        foreach ($monthly->items as $item) {
            if (! in_array($item->item_type->value, ['rent', 'service'], true) || ($item->meta['source'] ?? null) !== 'generated') {
                continue;
            }
            $from = max($actualEndDate, $period, $item->meta['start_date'] ?? $period);
            $to = min($monthEnd, $item->meta['end_date_exclusive'] ?? $monthEnd);
            $days = $this->days($from, $to, $from);
            if ($days < 1) {
                continue;
            }
            $daysInMonth = (int) ($item->meta['days_in_month'] ?? 0);
            if ($daysInMonth !== $month->daysInMonth || $item->unit_price < 0 || $item->amount < 0) {
                throw ValidationException::withMessages(['actual_end_date' => 'Snapshot hóa đơn tháng không nhất quán; cần đối chiếu.']);
            }
            $requested = Money::prorate($item->unit_price, $item->quantity, $days, $daysInMonth);
            if ($requested > 0) {
                $discounts[] = ['requested_amount' => $requested, 'description' => 'Giảm trừ '.$item->description.' từ ngày bàn giao',
                    'quantity' => $item->quantity, 'unit_price' => $item->unit_price,
                    'meta' => ['source' => 'generated', 'period' => $period, 'covered_invoice_id' => $monthly->id,
                        'covered_item_id' => $item->id, 'from_date' => $from, 'days' => $days, 'days_in_month' => $daysInMonth]];
            }
        }

        return $discounts;
    }

    private function meterLine(array &$items, MeterReading $reading, string $period, ?string $serviceCode): void
    {
        if ($serviceCode === null || ! in_array($serviceCode, [Service::CODE_ELECTRICITY, Service::CODE_WATER], true)) {
            throw ValidationException::withMessages(['actual_end_date' => 'Chỉ số định kỳ không liên kết dịch vụ Điện/Nước hệ thống.']);
        }
        if (bccomp($reading->consumption, '0', 2) === 0) {
            return;
        }
        $items[] = $this->line($serviceCode === Service::CODE_ELECTRICITY ? 'electricity' : 'water',
            $reading->service->name.' '.CarbonImmutable::parse($period)->format('m/Y'), $reading->consumption, $reading->unit_price,
            $reading->amount, ['source' => 'generated', 'period' => $period, 'meter_reading_id' => $reading->id,
                'previous_reading' => $reading->previous_reading, 'current_reading' => $reading->current_reading,
                'reading_date' => $reading->reading_date->format('Y-m-d'), 'unit' => $reading->service->unit]);
    }

    private function days(string $from, string $toExclusive, string $effectiveStart): int
    {
        $from = max($from, $effectiveStart);

        return $from >= $toExclusive ? 0 : CarbonImmutable::parse($from)->diff(CarbonImmutable::parse($toExclusive))->days;
    }

    private function line(string $type, string $description, string $quantity, int $unitPrice, int $amount, array $meta): array
    {
        if (trim($description) === '' || bccomp($quantity, '0', 2) <= 0 || $unitPrice < 0 || $unitPrice > Money::MAX_VND
            || abs($amount) > Money::MAX_VND || ($type !== 'discount' && $amount < 0)) {
            throw ValidationException::withMessages(['actual_end_date' => 'Số tiền dòng hóa đơn vượt giới hạn xử lý an toàn.']);
        }

        return ['item_type' => $type, 'description' => $description, 'quantity' => $quantity,
            'unit_price' => $unitPrice, 'amount' => $amount, 'meta' => $meta];
    }
}
