<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\DepositStatus;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Enums\MeterReadingKind;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\RoomStatus;
use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\ContractService as Subscription;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\MeterReading;
use App\Models\Payment;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use RuntimeException;

/** Reconciles held funds (D78); an explicit later confirmation records full external repayment (D85). */
class ContractSettlementService
{
    public function __construct(private readonly ContractFinalInvoiceService $finalInvoices, private readonly InvoiceService $invoices) {}

    public function preview(Contract $contract, User $actor): array
    {
        return $this->locked($contract, $actor, fn ($current, $room, $state) => $this->summary($current, $room, $state));
    }

    public function confirmRefund(Contract $contract, User $actor, array $data): array
    {
        abort_unless($this->hasRefundSchema(), 503, 'Cấu trúc xác nhận hoàn cọc chưa sẵn sàng trên môi trường này.');
        abort_unless(in_array($data['confirmed_paid'] ?? null, [true, 1, '1'], true), 422, 'Cần xác nhận đã hoàn đủ tiền cọc.');

        return $this->locked($contract, $actor, function ($current, $room, $state) use ($actor, $data) {
            $preview = $this->summary($current, $room, $state);
            abort_unless($current->status === ContractStatus::Terminated && $current->deposit_status === DepositStatus::Settled
                && $current->deposit_refund_amount > 0, 409, 'Chỉ xác nhận khoản cọc dư đã đối soát của hợp đồng đã thanh lý.');
            abort_unless($current->deposit_refund_amount === (int) $data['expected_refund_amount'], 409, 'Số cọc cần hoàn không khớp đối soát. Vui lòng tải lại.');
            if ($current->deposit_refunded_at !== null) {
                return $preview; // Replay preserves the first reviewer and timestamp, even from another Admin.
            }
            abort_unless(hash_equals($preview['revision'], $data['expected_revision']), 409, 'Đối soát vừa thay đổi. Vui lòng tải lại trước khi xác nhận hoàn cọc.');
            $current->deposit_refunded_at = now();
            $current->deposit_refunded_by = $actor->id;
            $current->save();

            return $this->summary($current, $room, $state);
        });
    }

    public function terminate(Contract $contract, User $actor, array $data): array
    {
        return $this->locked($contract, $actor, function ($current, $room, $state) use ($actor, $data) {
            $preview = $this->summary($current, $room, $state);
            if ($current->status === ContractStatus::Terminated) {
                // A replay must never free a room which may already have a new active tenant.
                return [...$preview, 'already_terminated' => true];
            }
            abort_unless(hash_equals($preview['revision'], $data['expected_revision']), 409, 'Đối soát vừa thay đổi. Vui lòng tải lại trước khi thanh lý.');
            abort_unless($preview['can_terminate'], 409, implode(' ', $preview['blockers']));

            foreach ($preview['invoices'] as $allocation) {
                if ($allocation['deposit_applied'] === 0) {
                    continue;
                }
                $invoice = $state['invoices']->firstWhere('id', $allocation['id']);
                // No pending transition: this is an internal allocation, not new money received.
                $payment = new Payment(['amount' => $allocation['deposit_applied'], 'method' => PaymentMethod::Deposit]);
                $payment->invoice_id = $invoice->id;
                $payment->submitted_by = $actor->id;
                $payment->reviewed_by = $actor->id;
                $payment->reviewed_at = now();
                $payment->status = PaymentStatus::Confirmed;
                $payment->save();
                $payment->receipt_number = 'RCP-'.now(config('app.business_timezone'))->format('Ym').'-'.str_pad((string) $payment->id, 4, '0', STR_PAD_LEFT);
                $payment->save();
                // Include DB defaults in the revision returned to the next action, just like a fresh GET.
                $state['payments']->push($payment->refresh());
                $invoice->paid_amount = Money::sum([$invoice->paid_amount, $payment->amount]);
                $invoice->status = $invoice->paid_amount === $invoice->total_amount ? InvoiceStatus::Paid : InvoiceStatus::PartiallyPaid;
                $invoice->save();
            }
            $current->deposit_deducted_amount = $preview['deposit_deducted_amount'];
            $current->deposit_refund_amount = $preview['deposit_refund_amount'];
            $current->deposit_status = DepositStatus::Settled;
            $current->deposit_settled_at = now();
            $current->closed_at = now();
            $current->status = ContractStatus::Terminated;
            $current->save(); // Existing observer schedules the deduplicated notification after commit.
            $lastDay = $current->actual_end_date->copy()->subDay()->format('Y-m-d');
            $unstarted = $this->unstartedScheduledServices($current, $state['subscriptions'])->keyBy('id');
            foreach ($state['subscriptions'] as $subscription) {
                if ($unstarted->has($subscription->id)) {
                    $subscription->delete();

                    continue;
                }
                if ($subscription->end_date === null || $subscription->end_date->format('Y-m-d') > $lastDay) {
                    $subscription->end_date = $lastDay;
                    $subscription->save();
                }
            }
            // The response revision must use the surviving rows, just like a fresh GET.
            $state['subscriptions'] = $state['subscriptions']->reject(fn ($line) => $unstarted->has($line->id))->values();
            $room->status = RoomStatus::Available;
            $room->save();

            // MySQL also changed the generated active_room_id/active_tenant_id to NULL.
            // Reload these server-computed values before publishing the next revision.
            $current->refresh()->setRelation('contractServices', $state['subscriptions']);

            return [...$this->summary($current, $room, $state), 'already_terminated' => false];
        });
    }

    /** Only later periodic registrations; preserve original activation snapshots and metered history. */
    private function unstartedScheduledServices(Contract $contract, Collection $subscriptions): Collection
    {
        if ($contract->actual_end_date === null) {
            return collect();
        }

        return $subscriptions->filter(fn ($line) => ! $line->service->isMetered()
            && ! in_array($line->service->code, [Service::CODE_ELECTRICITY, Service::CODE_WATER], true)
            && $line->start_date->gt($contract->start_date)
            && $line->start_date->gte($contract->actual_end_date));
    }

    private function locked(Contract $original, User $actor, callable $action): array
    {
        $this->finalInvoices->ensureReady();
        try {
            return DB::transaction(function () use ($original, $actor, $action) {
                $room = Room::whereKey($original->room_id)->lockForUpdate()->firstOrFail();
                $users = User::whereIn('id', [$original->user_id, $actor->id])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $user = $users->get($actor->id);
                abort_unless($user && $user->isActive() && $user->hasRole(UserRole::Admin), 403, 'Chỉ Admin đang hoạt động được đối soát và thanh lý.');
                $current = Contract::whereKey($original->id)->lockForUpdate()->firstOrFail();
                abort_unless($current->room_id === $room->id && $current->user_id === $original->user_id, 409, 'Hợp đồng đã đổi. Vui lòng tải lại.');
                $subscriptions = Subscription::where('contract_id', $current->id)->orderBy('id')->lockForUpdate()->get();
                $services = Service::whereIn('id', $subscriptions->pluck('service_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $subscriptions->each(fn ($line) => $line->setRelation('service', $services->get($line->service_id)));
                $readings = MeterReading::where('contract_id', $current->id)->orderBy('id')->lockForUpdate()->get();
                $invoices = Invoice::where('contract_id', $current->id)->orderBy('id')->lockForUpdate()->get();
                $payments = Payment::whereIn('invoice_id', $invoices->modelKeys())->orderBy('id')->lockForUpdate()->get();
                $current->setRelation('contractServices', $subscriptions);

                return $action($current, $room, compact('subscriptions', 'readings', 'invoices', 'payments'));
            }, 3);
        } catch (QueryException) {
            report(new RuntimeException('Đối soát hợp đồng thất bại do lỗi CSDL.'));
            abort(500, 'Không thể đối soát hợp đồng lúc này. Vui lòng thử lại sau.');
        } catch (InvalidArgumentException) {
            abort(409, 'Số tiền trong sổ đối soát chưa hợp lệ; cần kiểm tra trước khi thanh lý.');
        }
    }

    private function summary(Contract $contract, Room $room, array $state): array
    {
        $closed = $contract->status === ContractStatus::Terminated;
        abort_unless($closed || $contract->status === ContractStatus::Active, 409, 'Chỉ đối soát hợp đồng đang hiệu lực hoặc đã thanh lý.');
        abort_unless($contract->deposit_amount >= 0 && $contract->deposit_amount <= Money::MAX_VND, 409, 'Số tiền cọc vượt phạm vi được hỗ trợ; cần đối chiếu.');
        $this->assertLedger($state['invoices'], $state['payments']);
        $pending = $state['payments']->where('status', PaymentStatus::Pending);
        $depositPayments = $state['payments']->where('method', PaymentMethod::Deposit);
        $blockers = [];
        if ($closed) {
            abort_unless($contract->closed_at && $contract->actual_end_date && $contract->deposit_settled_at && $contract->deposit_status === DepositStatus::Settled
                && $depositPayments->every(fn ($payment) => $payment->status === PaymentStatus::Confirmed)
                && Money::sum($depositPayments->pluck('amount')->all()) === $contract->deposit_deducted_amount,
                409, 'Kết quả thanh lý chưa khớp sổ cọc; cần đối chiếu, không thực hiện lại.');
            $held = Money::sum([$contract->deposit_deducted_amount, $contract->deposit_refund_amount]);
            abort_unless($held === ($contract->deposit_paid_at ? $contract->deposit_amount : 0), 409, 'Tổng cọc đối soát không khớp số đã nhận.');
        } else {
            abort_if($contract->deposit_status === DepositStatus::Settled || $contract->deposit_status === DepositStatus::Transferred
                || $contract->deposit_settled_at || $contract->closed_at || $contract->deposit_deducted_amount !== 0
                || $contract->deposit_refund_amount !== 0 || $depositPayments->isNotEmpty(), 409, 'Sổ cọc đã có kết quả trước đó; cần đối chiếu trước khi thanh lý.');
            abort_if($contract->deposit_status === DepositStatus::Held && $contract->deposit_amount > 0 && ! $contract->deposit_paid_at,
                409, 'Cọc đang giữ thiếu xác nhận thực nhận; cần đối chiếu.');
            abort_if($contract->deposit_status === DepositStatus::Unpaid && $contract->deposit_paid_at !== null, 409, 'Trạng thái cọc chưa nhận không khớp thời điểm thu; cần đối chiếu.');
            $held = $contract->deposit_status === DepositStatus::Held ? $contract->deposit_amount : 0;
            if ($room->status !== RoomStatus::Occupied || ! $contract->activated_at) {
                $blockers[] = 'Phòng/hợp đồng chưa ở trạng thái đang thuê nhất quán.';
            }
            if ($contract->actual_end_date && $contract->actual_end_date->format('Y-m-d') > CarbonImmutable::now(config('app.business_timezone'))->format('Y-m-d')) {
                $blockers[] = 'Chưa tới ngày bàn giao thực tế.';
            }
            if ($pending->isNotEmpty()) {
                $blockers[] = 'Còn '.$pending->count().' thanh toán chờ xác nhận; cần xử lý trước khi thanh lý.';
            }
            if ($state['invoices']->contains('status', InvoiceStatus::Draft)) {
                $blockers[] = 'Cần phát hành hoặc hủy hóa đơn nháp trước khi thanh lý.';
            }
            $unstarted = $this->unstartedScheduledServices($contract, $state['subscriptions']);
            // No status/contract restriction: even cancelled or legacy invoice references protect history.
            // Official invoice writers hold this same contract lock before creating their item snapshots.
            $hasReferencedScheduledService = $unstarted->isNotEmpty()
                && InvoiceItem::whereIn('meta->contract_service_id', $unstarted->pluck('id')->all())->exists();
            if ($hasReferencedScheduledService) {
                $blockers[] = 'Dịch vụ kỳ sau chưa sử dụng đã được hóa đơn tham chiếu; cần đối chiếu trước khi thanh lý.';
            }
            $finals = $state['invoices']->filter(fn ($invoice) => $invoice->type === InvoiceType::Final && $invoice->status !== InvoiceStatus::Cancelled);
            $final = $finals->count() === 1 ? $finals->first() : null;
            if (! $final || ! $final->issued_at || ! in_array($final->status, [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid, InvoiceStatus::Paid], true)
                || ! $contract->actual_end_date || ! $contract->inspection_result || ! $contract->inspected_at) {
                $blockers[] = 'Cần kiểm kê, chốt chỉ số và phát hành đúng một hóa đơn tất toán.';
            } else {
                $finalMeters = $state['readings']->where('kind', MeterReadingKind::Final);
                $codes = $finalMeters->map(fn ($reading) => $state['subscriptions']->firstWhere('service_id', $reading->service_id)?->service?->code)->sort()->values()->all();
                if ($codes !== ['ELECTRICITY', 'WATER'] || ! $finalMeters->every(fn ($reading) => $reading->invoice_id === $final->id
                    && $reading->room_id === $room->id && $reading->reading_date->format('Y-m-d') === $contract->actual_end_date->format('Y-m-d'))
                    || $state['readings']->contains(fn ($reading) => $reading->invoice_id === null)) {
                    $blockers[] = 'Chỉ số chốt hoặc liên kết hóa đơn chưa khớp; cần đối chiếu.';
                } elseif ($pending->isEmpty() && ! $state['invoices']->contains('status', InvoiceStatus::Draft) && ! $hasReferencedScheduledService) {
                    $final->setRelation('items', InvoiceItem::where('invoice_id', $final->id)->orderBy('id')->lockForUpdate()->get());
                    $this->invoices->assertFinalSnapshot($final, $contract, $state);
                }
            }
        }
        $remainingDeposit = $closed ? 0 : $held;
        $debt = [];
        $after = [];
        $allocations = [];
        foreach ($state['invoices']->sortBy(fn ($invoice) => [$invoice->due_date?->format('Y-m-d') ?? '', $invoice->id]) as $invoice) {
            if (! in_array($invoice->status, [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid], true)) {
                continue;
            }
            abort_unless($invoice->due_date && $invoice->issued_at, 409, 'Hóa đơn còn nợ thiếu ngày phát hành/hạn trả; không thể tự suy thứ tự khấu trừ.');
            $balance = Money::remaining($invoice->total_amount, $invoice->paid_amount);
            $applied = min($remainingDeposit, $balance);
            $remainingDeposit = Money::remaining($remainingDeposit, $applied);
            $remaining = Money::remaining($balance, $applied);
            // Contract-wide totals can exceed the safe integer limit of a single invoice.
            $debt[] = $balance;
            $after[] = $remaining;
            $allocations[] = ['id' => $invoice->id, 'invoice_number' => $invoice->invoice_number, 'type' => $invoice->type->value,
                'due_date' => $invoice->due_date->format('Y-m-d'), 'outstanding_amount' => $balance,
                'deposit_applied' => $applied, 'outstanding_after' => $remaining];
        }

        return ['contract_id' => $contract->id, 'status' => $contract->status->value, 'room_status' => $room->status->value,
            'actual_end_date' => $contract->actual_end_date?->format('Y-m-d'), 'closed_at' => $contract->closed_at?->toISOString(),
            'deposit_status' => $contract->deposit_status->value, 'deposit_settled_at' => $contract->deposit_settled_at?->toISOString(),
            'held_amount' => $held, 'deposit_deducted_amount' => $closed ? $contract->deposit_deducted_amount : Money::remaining($held, $remainingDeposit),
            'deposit_refund_amount' => $closed ? $contract->deposit_refund_amount : $remainingDeposit,
            'refund_recording' => 'unpaid_obligation', 'outstanding_amount' => Money::aggregate($debt), 'outstanding_after' => Money::aggregate($after),
            'pending_payment_count' => $pending->count(), 'pending_payment_ids' => $pending->pluck('id')->values()->all(),
            'invoices' => $allocations, 'deposit_payments' => $depositPayments->map(fn ($payment) => [
                'id' => $payment->id, 'invoice_id' => $payment->invoice_id, 'amount' => $payment->amount, 'receipt_number' => $payment->receipt_number,
            ])->values()->all(),
            'can_terminate' => ! $closed && $blockers === [], 'is_preview' => ! $closed, 'blockers' => $blockers,
            'revision' => $this->revision($contract, $state), 'already_terminated' => $closed,
            ...$this->refundSummary($contract, $closed ? $contract->deposit_refund_amount : $remainingDeposit)];
    }

    private function hasRefundSchema(): bool
    {
        return Schema::hasColumns('contracts', ['deposit_refunded_at', 'deposit_refunded_by']);
    }

    private function refundSummary(Contract $contract, int $refundAmount): array
    {
        if (! $this->hasRefundSchema()) {
            return []; // Existing preview/termination keep working before the separately approved dev upgrade.
        }
        $refunded = $contract->deposit_refunded_at !== null;
        abort_unless($refunded === ($contract->deposit_refunded_by !== null), 409, 'Dấu vết hoàn cọc chưa đầy đủ; cần đối chiếu.');
        abort_if($refunded && ($contract->status !== ContractStatus::Terminated || $contract->deposit_status !== DepositStatus::Settled
            || $contract->deposit_refund_amount <= 0), 409, 'Xác nhận hoàn cọc không khớp trạng thái hợp đồng.');

        return ['deposit_refunded_at' => $contract->deposit_refunded_at?->toISOString(),
            'deposit_refunded_by' => $contract->deposit_refunded_by,
            'refund_outstanding_amount' => $refunded ? 0 : $refundAmount];
    }

    private function assertLedger(Collection $invoices, Collection $payments): void
    {
        foreach ($invoices as $invoice) {
            $confirmed = $payments->where('invoice_id', $invoice->id)->where('status', PaymentStatus::Confirmed);
            $paid = Money::sum($confirmed->pluck('amount')->all());
            abort_unless($confirmed->every(fn ($payment) => $payment->amount > 0) && $paid === $invoice->paid_amount
                && $paid <= $invoice->total_amount && $invoice->total_amount <= Money::MAX_VND,
                409, 'Sổ thanh toán chưa khớp hóa đơn; cần đối chiếu trước khi thanh lý.');
            $valid = match ($invoice->status) {
                InvoiceStatus::Draft, InvoiceStatus::Cancelled => $paid === 0,
                InvoiceStatus::Paid => $paid === $invoice->total_amount,
                InvoiceStatus::Issued => $paid === 0 && $invoice->total_amount > 0,
                InvoiceStatus::PartiallyPaid => $paid > 0 && $paid < $invoice->total_amount,
            };
            abort_unless($valid, 409, 'Trạng thái hóa đơn chưa khớp sổ thanh toán; cần đối chiếu.');
        }
    }

    private function revision(Contract $contract, array $state): string
    {
        $rows = fn ($models) => $models->map(function ($model) {
            $attributes = $model->getRawOriginal();
            ksort($attributes);

            return $attributes;
        })->all();

        return hash('sha256', json_encode([$contract->lifecycleRevision(), $rows($state['readings']), $rows($state['invoices']), $rows($state['payments'])], JSON_THROW_ON_ERROR));
    }
}
