<?php

namespace App\Services;

use App\Enums\MeterReadingKind;
use App\Enums\ServiceBillingType;
use App\Models\Contract;
use App\Models\Service;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/** Pure draft calculation from locked contract/subscription/reading snapshots. */
class InvoiceCalculationService
{
    public function calculate(Contract $contract, string $period, Collection $subscriptions, Collection $readings, ?int $invoiceId = null): array
    {
        $start = CarbonImmutable::parse($period, config('app.business_timezone'));
        $next = $start->addMonth();
        $days = $this->days($period, $next->format('Y-m-d'), $contract->start_date->format('Y-m-d'), $contract->actual_end_date?->format('Y-m-d'));
        if ($days === 0) {
            $this->invalid('Hợp đồng không có ngày tính tiền trong kỳ hóa đơn này.');
        }
        $items = [$this->line('rent', 'Tiền phòng '.$start->format('m/Y'), '1.00', $contract->monthly_rent,
            Money::prorate($contract->monthly_rent, '1.00', $days, $start->daysInMonth),
            ['source' => 'generated', 'period' => $period, 'active_days' => $days, 'days_in_month' => $start->daysInMonth,
                'contract_id' => $contract->id, 'start_date' => $contract->start_date->format('Y-m-d'), 'actual_end_date' => $contract->actual_end_date?->format('Y-m-d')])];
        foreach ($subscriptions->sortBy('id') as $subscription) {
            $service = $subscription->service;
            if ($service->isMetered()) {
                continue;
            }
            $serviceStart = max($contract->start_date->format('Y-m-d'), $subscription->start_date->format('Y-m-d'));
            $serviceEnd = $subscription->end_date?->addDay()->format('Y-m-d');
            if ($contract->actual_end_date !== null) {
                $serviceEnd = $serviceEnd ? min($serviceEnd, $contract->actual_end_date->format('Y-m-d')) : $contract->actual_end_date->format('Y-m-d');
            }
            $activeDays = $this->days($period, $next->format('Y-m-d'), $serviceStart, $serviceEnd);
            if (! $activeDays) {
                continue;
            }
            if ($subscription->unit_price === null || $subscription->unit_price < 0 || bccomp($subscription->quantity, '0', 2) <= 0
                || ($service->billing_type === ServiceBillingType::PerRoom && bccomp($subscription->quantity, '1', 2) !== 0)) {
                $this->invalid('Dịch vụ hợp đồng thiếu snapshot giá/số lượng hợp lệ.');
            }
            $items[] = $this->line('service', $service->name.' '.$start->format('m/Y'), $subscription->quantity, $subscription->unit_price,
                Money::prorate($subscription->unit_price, $subscription->quantity, $activeDays, $start->daysInMonth),
                ['source' => 'generated', 'period' => $period, 'contract_service_id' => $subscription->id, 'service_id' => $service->id,
                    'billing_type' => $service->billing_type->value, 'unit' => $service->unit, 'active_days' => $activeDays,
                    'days_in_month' => $start->daysInMonth, 'start_date' => $serviceStart, 'end_date_exclusive' => $serviceEnd]);
        }
        $prior = $start->subMonth()->format('Y-m-d');
        $priorDays = $this->days($prior, $period, $contract->start_date->format('Y-m-d'), $contract->actual_end_date?->format('Y-m-d'));
        $meters = [];
        if ($priorDays > 0) {
            $metered = $subscriptions->filter(function ($line) use ($contract, $prior, $period) {
                $from = max($contract->start_date->format('Y-m-d'), $line->start_date->format('Y-m-d'));
                $to = $line->end_date?->addDay()->format('Y-m-d');
                if ($contract->actual_end_date !== null) {
                    $to = $to ? min($to, $contract->actual_end_date->format('Y-m-d')) : $contract->actual_end_date->format('Y-m-d');
                }

                return $line->service->isMetered() && $this->days($prior, $period, $from, $to) > 0;
            });
            if ($metered->pluck('service.code')->unique()->sort()->values()->all() !== [Service::CODE_ELECTRICITY, Service::CODE_WATER]) {
                $this->invalid('Hợp đồng thiếu đăng ký Điện/Nước cho kỳ tiêu thụ '.$prior.'.');
            }
            foreach ($metered->unique('service_id')->sortBy('service_id') as $subscription) {
                $matches = $readings->filter(fn ($reading) => $reading->contract_id === $contract->id && $reading->service_id === $subscription->service_id
                    && $reading->kind === MeterReadingKind::Periodic && $reading->period->format('Y-m-d') === $prior);
                if ($matches->count() !== 1) {
                    $this->invalid('Thiếu chỉ số '.$subscription->service->name.' kỳ '.$prior.' thuộc hợp đồng này.');
                }
                $reading = $matches->first();
                if ($reading->invoice_id !== null && $reading->invoice_id !== $invoiceId) {
                    abort(409, 'Chỉ số đã thuộc hóa đơn khác. Không tính trùng điện nước.');
                }
                if ($reading->room_id !== $contract->room_id || $reading->unit_price < 1 || $reading->unit_price > Money::MAX_VND || $reading->amount < 0
                    || bccomp(bcsub($reading->current_reading, $reading->previous_reading, 2), $reading->consumption, 2) !== 0
                    || Money::meterAmount($reading->consumption, $reading->unit_price) !== $reading->amount) {
                    $this->invalid('Snapshot chỉ số không nhất quán; cần đối chiếu trước khi lập hóa đơn.');
                }
                $meters[] = $reading->id;
                if (bccomp($reading->consumption, '0', 2) === 0) {
                    continue; // Keep the real reading linked; invoice_items.quantity must remain positive.
                }
                $items[] = $this->line($subscription->service->code === Service::CODE_ELECTRICITY ? 'electricity' : 'water',
                    $subscription->service->name.' '.CarbonImmutable::parse($prior)->format('m/Y'), $reading->consumption, $reading->unit_price, $reading->amount,
                    ['source' => 'generated', 'period' => $prior, 'service_id' => $reading->service_id, 'meter_reading_id' => $reading->id,
                        'previous_reading' => $reading->previous_reading, 'current_reading' => $reading->current_reading, 'reading_date' => $reading->reading_date->format('Y-m-d'), 'unit' => $subscription->service->unit]);
            }
        }
        Money::sum(array_column($items, 'amount'));

        return ['items' => $items, 'meter_ids' => $meters];
    }

    private function line(string $type, string $description, string $quantity, int $price, int $amount, array $meta): array
    {
        if ($price < 0 || $price > Money::MAX_VND || $amount < 0 || $amount > Money::MAX_VND) {
            $this->invalid('Số tiền một dòng vượt phạm vi được hỗ trợ.');
        }

        return ['item_type' => $type, 'description' => $description, 'quantity' => $quantity,
            'unit_price' => $price, 'amount' => $amount, 'meta' => $meta];
    }

    private function days(string $from, string $toExclusive, string $effectiveStart, ?string $effectiveEnd): int
    {
        $from = max($from, $effectiveStart);
        $to = $effectiveEnd ? min($toExclusive, $effectiveEnd) : $toExclusive;

        return $from >= $to ? 0 : CarbonImmutable::parse($from)->diff(CarbonImmutable::parse($to))->days;
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['period' => $message]);
    }
}
