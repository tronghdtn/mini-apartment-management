<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\InvoiceItemType;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Enums\MeterReadingKind;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\ContractService;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\MeterReading;
use App\Models\Payment;
use App\Models\Room;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;

class InvoiceService
{
    public function __construct(
        private readonly InvoiceCalculationService $calculator,
        private readonly FinalInvoiceCalculationService $finalCalculator,
        private readonly ContractTerminationFeeCalculator $terminationFees,
    ) {}

    public function ensureReady(): void
    {
        foreach (['invoices', 'invoice_items', 'contracts', 'contract_services', 'meter_readings', 'payments'] as $table) {
            abort_unless(Schema::hasTable($table), 503, 'Cấu trúc hóa đơn chưa sẵn sàng trên môi trường này.');
        }
    }

    private function query(): Builder
    {
        return Invoice::with(['contract' => fn ($query) => $query->withTrashed()->with(['room.building:id,name', 'tenant:id,full_name'])]);
    }

    public function find(int $id): Invoice
    {
        $this->ensureReady();

        return $this->query()->with(['items' => fn ($q) => $q->orderBy('id'), 'meterReadings.service:id,name,unit',
            'replacements:id,related_invoice_id'])->findOrFail($id);
    }

    public function paginate(User $actor, array $filters): LengthAwarePaginator
    {
        $this->ensureReady();
        $query = $this->query();
        if (! $actor->hasRole(UserRole::Admin)) {
            $query->where('status', '<>', InvoiceStatus::Draft)->whereHas('contract', fn ($q) => $q->withTrashed()->where('user_id', $actor->id));
        }
        foreach (['status', 'type', 'period', 'contract_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (isset($filters['room_id'])) {
            $query->whereHas('contract', fn ($q) => $q->withTrashed()->where('room_id', $filters['room_id']));
        }
        if ($filters['overdue'] ?? false) {
            $query->whereIn('status', [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid])->whereColumn('paid_amount', '<', 'total_amount')
                ->where('due_date', '<', $this->today());
        }

        return $query->orderByDesc('id')->paginate(20)->withQueryString();
    }

    public function createMonthly(array $data): Invoice
    {
        $this->ensureReady();
        $contract = Contract::findOrFail($data['contract_id']);

        return $this->locked($contract, function ($current, $state) use ($data) {
            $this->requireActiveMonthly($current, $state);
            abort_if($state['invoices']->contains(fn ($invoice) => $invoice->type === InvoiceType::Monthly && $invoice->status !== InvoiceStatus::Cancelled
                && $invoice->period->format('Y-m-d') === $data['period']), 409, 'Đã có hóa đơn tháng chưa hủy cho hợp đồng/kỳ này.');
            if (isset($data['related_invoice_id'])) {
                $related = $state['invoices']->firstWhere('id', (int) $data['related_invoice_id']);
                if (! $related || $related->status !== InvoiceStatus::Cancelled || $related->type !== InvoiceType::Monthly || $related->period->format('Y-m-d') !== $data['period']) {
                    $this->invalid('related_invoice_id', 'Chỉ lập lại từ hóa đơn tháng đã hủy cùng hợp đồng/kỳ.');
                }
            }
            $previous = $state['invoices']->filter(fn ($invoice) => $invoice->type === InvoiceType::Monthly
                && $invoice->status === InvoiceStatus::Cancelled && $invoice->period->format('Y-m-d') === $data['period'])->last();
            $invoice = new Invoice(['contract_id' => $current->id, 'type' => InvoiceType::Monthly, 'period' => $data['period']]);
            $invoice->related_invoice_id = $data['related_invoice_id'] ?? $previous?->id;
            $invoice->save();
            $calculation = $this->calculator->calculate($current, $data['period'], $state['subscriptions'], $state['readings'], $invoice->id);
            $this->replaceGenerated($invoice, $calculation);

            return $this->find($invoice->id);
        });
    }

    public function refresh(Invoice $original, string $revision): Invoice
    {
        return $this->change($original, $revision, function ($invoice, $contract, $state) {
            $this->draft($invoice);
            if ($invoice->type === InvoiceType::Final) {
                $this->requireActiveFinal($invoice, $contract, $state);
                $calculation = $this->finalCalculation($invoice, $contract, $state);
                $this->replaceGenerated($invoice, $calculation);
                $this->syncFinalRefundNote($contract, $calculation['refund_outside_system_amount']);

                return;
            }
            $this->monthly($invoice);
            $this->requireActiveMonthly($contract, $state);
            $this->replaceGenerated($invoice, $this->calculator->calculate($contract, $invoice->period->format('Y-m-d'), $state['subscriptions'], $state['readings'], $invoice->id));
        });
    }

    public function other(Invoice $original, User $actor, array $data, ?int $itemId = null, bool $remove = false): Invoice
    {
        return $this->change($original, $data['expected_revision'], function ($invoice, $contract, $state) use ($actor, $data, $itemId, $remove) {
            $this->draft($invoice);
            $item = $itemId ? $invoice->items->firstWhere('id', $itemId) : new InvoiceItem;
            abort_unless($item && (! $itemId || ($item->item_type->value === 'other' && ($item->meta['source'] ?? null) === 'manual'
                && ! ($item->meta['voided'] ?? false))), 409, 'Khoản thu không còn ở trạng thái có thể sửa.');
            $before = $itemId ? ['description' => $item->description, 'amount' => $item->amount, 'basis' => $item->meta['basis']] : null;
            $after = $remove ? null : ['description' => $data['description'], 'amount' => (int) $data['amount'], 'basis' => $data['basis']];
            $meta = $item->meta ?? ['source' => 'manual', 'audit' => []];
            $meta['audit'][] = ['action' => $remove ? 'removed' : ($itemId ? 'updated' : 'created'), 'actor_id' => $actor->id,
                'at' => now()->toISOString(), 'before' => $before, 'after' => $after, 'reason' => $remove ? $data['reason'] : $data['basis']];
            $meta['voided'] = $remove;
            $meta['basis'] = $remove ? $meta['basis'] : $data['basis'];
            $item->invoice_id = $invoice->id;
            $item->item_type = 'other';
            $item->quantity = '1.00';
            $item->description = $remove ? $item->description : $data['description'];
            $item->unit_price = $remove ? 0 : (int) $data['amount'];
            $item->amount = $item->unit_price;
            $item->meta = $meta;
            $item->save();
            $invoice->load('items');
            if ($invoice->type === InvoiceType::Final) {
                $this->requireActiveFinal($invoice, $contract, $state);
                $calculation = $this->finalCalculation($invoice, $contract, $state);
                $this->replaceGenerated($invoice, $calculation);
                $this->syncFinalRefundNote($contract, $calculation['refund_outside_system_amount']);
            } else {
                $this->total($invoice);
            }
        });
    }

    public function issue(Invoice $original, string $revision): Invoice
    {
        return $this->change($original, $revision, function ($invoice, $contract, $state) {
            $this->draft($invoice);
            if ($invoice->type === InvoiceType::Final) {
                $this->requireActiveFinal($invoice, $contract, $state);
                abort_if($contract->actual_end_date->format('Y-m-d') > $this->today(), 409, 'Chưa tới ngày bàn giao thực tế.');
                $calculation = $this->finalCalculation($invoice, $contract, $state);
                $this->syncFinalRefundNote($contract, $calculation['refund_outside_system_amount']);
            } else {
                $this->monthly($invoice);
                $this->requireActiveMonthly($contract, $state);
                abort_if($invoice->period->format('Y-m-d') > $this->today(), 409, 'Chưa tới ngày đầu của kỳ hóa đơn. Chỉ được chuẩn bị bản nháp.');
                $calculation = $this->calculator->calculate($contract, $invoice->period->format('Y-m-d'), $state['subscriptions'], $state['readings'], $invoice->id);
            }
            $stored = $invoice->items->filter(fn ($item) => ($item->meta['source'] ?? null) === 'generated')->map(fn ($item) => [
                'item_type' => $item->item_type->value, 'description' => $item->description, 'quantity' => $item->quantity,
                'unit_price' => $item->unit_price, 'amount' => $item->amount, 'meta' => $item->meta,
            ])->values()->all();
            // Compare canonical JSON: MySQL normalizes JSON object-key order on read.
            abort_unless($this->canonical($stored) === $this->canonical($calculation['items']), 409, 'Nguồn tính hóa đơn đã thay đổi. Cần cập nhật và kiểm tra lại bản nháp.');
            $linked = $state['readings']->where('invoice_id', $invoice->id)->pluck('id')->sort()->values()->all();
            $expected = collect($calculation['meter_ids'])->sort()->values()->all();
            abort_unless($linked === $expected, 409, 'Liên kết chỉ số đã thay đổi. Vui lòng cập nhật bản nháp.');
            $this->validateManualItems($invoice);
            $this->total($invoice);
            $days = Setting::where('key', 'invoice.due_days')->value('value') ?? '5';
            if (! ctype_digit((string) $days) || (int) $days < 1 || (int) $days > 365) {
                $this->invalid('period', 'Cấu hình số ngày đến hạn không hợp lệ. Cần Admin kiểm tra.');
            }
            $invoice->invoice_number = 'INV-'.now(config('app.business_timezone'))->format('Ym').'-'.str_pad((string) $invoice->id, 4, '0', STR_PAD_LEFT);
            $invoice->issued_at = now();
            $invoice->due_date = CarbonImmutable::parse($this->today())->addDays((int) $days)->format('Y-m-d');
            $invoice->status = $invoice->total_amount === 0 ? InvoiceStatus::Paid : InvoiceStatus::Issued;
            $invoice->save();
        });
    }

    public function cancel(Invoice $original, array $data): Invoice
    {
        return $this->change($original, $data['expected_revision'], function ($invoice, $contract, $state) use ($data) {
            abort_if($invoice->status === InvoiceStatus::Cancelled, 409, 'Hóa đơn đã hủy.');
            $payments = $state['payments']->where('invoice_id', $invoice->id);
            abort_if($payments->contains('status', PaymentStatus::Confirmed) || $invoice->paid_amount > 0, 409, 'Hóa đơn đã có tiền xác nhận; cần quy trình điều chỉnh.');
            abort_if($payments->contains('status', PaymentStatus::Pending), 409, 'Cần xử lý thanh toán đang chờ đối soát trước khi hủy.');
            $invoice->status = InvoiceStatus::Cancelled;
            $invoice->cancel_reason = $data['reason'];
            $invoice->save();
            MeterReading::where('invoice_id', $invoice->id)->update(['invoice_id' => null]);
        });
    }

    private function change(Invoice $original, string $revision, callable $action): Invoice
    {
        return $this->locked($original->contract, function ($contract, $state) use ($original, $revision, $action) {
            $invoice = $state['invoices']->firstWhere('id', $original->id);
            abort_unless($invoice && $invoice->contract_id === $original->contract_id, 409, 'Hóa đơn đã thay đổi.');
            $invoice->setRelation('items', InvoiceItem::where('invoice_id', $invoice->id)->orderBy('id')->lockForUpdate()->get());
            abort_unless(hash_equals($invoice->revision(), $revision), 409, 'Hóa đơn vừa thay đổi. Vui lòng tải lại trước khi thao tác.');
            $action($invoice, $contract, $state);

            return $this->find($invoice->id);
        });
    }

    private function locked(Contract $original, callable $action): Invoice
    {
        try {
            return DB::transaction(function () use ($original, $action) {
                Room::whereKey($original->room_id)->lockForUpdate()->firstOrFail();
                User::whereKey($original->user_id)->lockForUpdate()->firstOrFail();
                $contract = Contract::withTrashed()->whereKey($original->id)->lockForUpdate()->firstOrFail();
                abort_unless($contract->room_id === $original->room_id && $contract->user_id === $original->user_id, 409, 'Hợp đồng đã đổi. Vui lòng tải lại.');
                $subscriptions = ContractService::where('contract_id', $contract->id)->orderBy('id')->lockForUpdate()->get();
                $services = Service::whereIn('id', $subscriptions->pluck('service_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $subscriptions->each(fn ($line) => $line->setRelation('service', $services->get($line->service_id)));
                $readings = MeterReading::where('contract_id', $contract->id)->orderBy('id')->lockForUpdate()->get();
                $invoices = Invoice::where('contract_id', $contract->id)->orderBy('id')->lockForUpdate()->get();
                abort_if(MeterReading::whereIn('invoice_id', $invoices->modelKeys())->where(function ($query) use ($contract) {
                    $query->whereNull('contract_id')->orWhere('contract_id', '<>', $contract->id)->orWhere('room_id', '<>', $contract->room_id);
                })->exists(), 409, 'Liên kết chỉ số không khớp hợp đồng/phòng; cần đối chiếu dữ liệu.');
                $payments = Payment::whereIn('invoice_id', $invoices->modelKeys())->orderBy('id')->lockForUpdate()->get();

                return $action($contract, compact('subscriptions', 'readings', 'invoices', 'payments'));
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Hóa đơn hoặc mã hóa đơn vừa được tạo bởi thao tác khác. Vui lòng tải lại.');
        } catch (QueryException) {
            report(new RuntimeException('Thao tác hóa đơn thất bại do lỗi CSDL.'));
            abort(500, 'Không thể lưu hóa đơn lúc này. Vui lòng thử lại sau.');
        } catch (InvalidArgumentException $exception) {
            $this->invalid('period', $exception->getMessage());
        }
    }

    private function draft(Invoice $invoice): void
    {
        abort_unless($invoice->isDraft(), 409, 'Hóa đơn đã phát hành hoặc hủy; không được sửa trực tiếp.');
        abort_if(Payment::where('invoice_id', $invoice->id)->exists(), 409, 'Bản nháp đã có lịch sử thanh toán, cần đối chiếu trước.');
    }

    private function monthly(Invoice $invoice): void
    {
        abort_unless($invoice->type === InvoiceType::Monthly, 409, 'Thao tác này chỉ hỗ trợ hóa đơn tháng.');
    }

    private function validateManualItems(Invoice $invoice): void
    {
        foreach ($invoice->items as $item) {
            $source = $item->meta['source'] ?? null;
            abort_unless(in_array($source, ['generated', 'manual'], true), 409, 'Khoản thu chưa xác định nguồn; cần đối chiếu.');
            if ($source !== 'manual') {
                continue;
            }
            abort_unless($item->item_type->value === 'other' && trim($item->description) !== ''
                && trim($item->meta['basis'] ?? '') !== '' && ! empty($item->meta['audit'])
                && bccomp($item->quantity, '1', 2) === 0 && $item->amount === $item->unit_price
                && $item->amount >= 0 && $item->amount <= Money::MAX_VND
                && (! ($item->meta['voided'] ?? false) || $item->amount === 0), 409,
                'Khoản khác thiếu căn cứ/lịch sử hoặc snapshot không hợp lệ; cần đối chiếu.');
        }
    }

    private function requireActiveMonthly(Contract $contract, array $state): void
    {
        abort_unless($contract->status === ContractStatus::Active && $contract->activated_at !== null && ! $contract->trashed(), 409, 'Chỉ lập/phát hành hóa đơn tháng cho hợp đồng đang hiệu lực.');
        abort_if($state['invoices']->contains(fn ($invoice) => $invoice->type === InvoiceType::Final && $invoice->status !== InvoiceStatus::Cancelled), 409, 'Hợp đồng đã có hóa đơn tất toán chưa hủy.');
    }

    private function requireActiveFinal(Invoice $invoice, Contract $contract, array $state): void
    {
        abort_unless($invoice->type === InvoiceType::Final && $contract->status === ContractStatus::Active
            && $contract->activated_at !== null && ! $contract->trashed() && $contract->actual_end_date !== null
            && $contract->inspection_result !== null, 409, 'Hóa đơn tất toán cần hợp đồng đang hiệu lực, ngày bàn giao và kết quả kiểm kê.');
        abort_unless($invoice->period->format('Y-m-d') === CarbonImmutable::parse($contract->actual_end_date->format('Y-m-d'))->startOfMonth()->format('Y-m-d'),
            409, 'Kỳ hóa đơn tất toán không khớp ngày bàn giao.');
        abort_if($state['invoices']->contains(fn ($candidate) => $candidate->type === InvoiceType::Final
            && $candidate->id !== $invoice->id && $candidate->status !== InvoiceStatus::Cancelled), 409,
            'Hợp đồng đã có hóa đơn tất toán chưa hủy.');
    }

    /** @return array{items: array, meter_ids: array, amount: int, refund_outside_system_amount: int} */
    private function finalCalculation(Invoice $invoice, Contract $contract, array $state): array
    {
        $date = $contract->actual_end_date->format('Y-m-d');
        $period = CarbonImmutable::parse($date, config('app.business_timezone'))->startOfMonth()->format('Y-m-d');
        $meters = $state['readings']->where('kind', MeterReadingKind::Final)->sortBy('service_id')->values();
        abort_unless($meters->count() === 2 && $meters->every(fn (MeterReading $reading) => $reading->reading_date->format('Y-m-d') === $date
            && $reading->period->format('Y-m-d') === $period && $reading->invoice_id === $invoice->id), 409,
            'Hóa đơn cần đúng hai chỉ số chốt đang được liên kết.');
        $finalReadings = $meters->map(fn (MeterReading $reading) => [
            'id' => $reading->id, 'service_code' => $reading->service?->code, 'service_name' => $reading->service?->name,
            'unit' => $reading->service?->unit, 'previous_reading' => $reading->previous_reading,
            'current_reading' => $reading->current_reading, 'consumption' => $reading->consumption,
            'unit_price' => $reading->unit_price, 'amount' => $reading->amount,
        ])->all();
        $damageItems = $invoice->items->where('item_type', InvoiceItemType::Damage)->values();
        abort_unless(($contract->inspection_result?->value === 'damaged' && $damageItems->isNotEmpty())
            || ($contract->inspection_result?->value === 'no_damage' && $damageItems->isEmpty()), 409,
            'Khoản bồi thường không khớp kết quả kiểm kê đã lưu.');
        if ($contract->early_termination_waiver_code !== null) {
            abort_unless($contract->attachments()->where('collection', Attachment::CONTRACT_WAIVER_EVIDENCE)
                ->where('disk', 'private')->exists(), 409, 'Cần giữ nguyên ảnh căn cứ miễn phí đã xác nhận.');
        }
        $damages = $damageItems->map(fn ($item) => [
            'description' => $item->description, 'reason' => $item->meta['reason'] ?? '',
            'basis' => $item->meta['basis'] ?? '', 'amount' => $item->amount,
            'attachment_ids' => $item->meta['attachment_ids'] ?? [],
        ])->all();
        if ($damages !== []) {
            $attachmentIds = collect($damages)->flatMap(fn ($damage) => $damage['attachment_ids'])->unique()->sort()->values()->all();
            $validIds = Attachment::query()->where('attachable_type', 'contract')->where('attachable_id', $contract->id)
                ->where('collection', Attachment::CONTRACT_DAMAGE_PHOTO)->where('disk', 'private')
                ->whereIn('id', $attachmentIds)->orderBy('id')->pluck('id')->all();
            abort_unless($attachmentIds !== [] && $validIds === $attachmentIds, 409,
                'Ảnh căn cứ bồi thường thiếu hoặc không thuộc hợp đồng này.');
        }

        return $this->finalCalculator->calculate($contract, $date, $period, $state['subscriptions'], $state['readings'],
            $state['invoices'], $finalReadings, $this->terminationFees->calculate($contract, $date), $damages, $invoice->id,
            Money::sum($invoice->items->filter(fn ($item) => ($item->meta['source'] ?? null) === 'manual')->pluck('amount')->all()));
    }

    /** Called only with the contract locked inside the invoice transaction. No money is paid here. */
    public function syncFinalRefundNote(Contract $contract, int $amount): void
    {
        $prefix = '[Tất toán — khoản hoàn ngoài hệ thống] ';
        $lines = preg_split('/\R/u', (string) $contract->closure_note) ?: [];
        $lines = array_filter($lines, fn (string $line): bool => ! str_starts_with($line, $prefix));
        if ($amount > 0) {
            $lines[] = $prefix.number_format($amount, 0, ',', '.').' VND; chưa xác nhận đã hoàn.';
        }
        $note = trim(implode("\n", $lines));
        if (strlen($note) > 65535) {
            $this->invalid('closure_note', 'Ghi chú kèm khoản hoàn vượt giới hạn lưu trữ. Vui lòng rút gọn ghi chú.');
        }
        if ($contract->closure_note !== $note) {
            $contract->closure_note = $note;
            $contract->save();
        }
    }

    private function replaceGenerated(Invoice $invoice, array $calculation): void
    {
        foreach ($invoice->items()->get() as $item) {
            abort_unless(in_array($item->meta['source'] ?? null, ['generated', 'manual'], true), 409, 'Hóa đơn có khoản mục chưa xác định nguồn; cần đối chiếu.');
            if (($item->meta['source'] ?? null) === 'generated') {
                $item->delete();
            }
        }
        foreach ($calculation['items'] as $item) {
            $invoice->items()->create($item);
        }
        MeterReading::where('invoice_id', $invoice->id)->update(['invoice_id' => null]);
        MeterReading::whereIn('id', $calculation['meter_ids'])->update(['invoice_id' => $invoice->id]);
        $invoice->load('items');
        $this->total($invoice);
    }

    private function total(Invoice $invoice): void
    {
        $amount = Money::sum($invoice->items->pluck('amount')->all());
        if ($amount < 0) {
            $this->invalid('period', 'Tổng hóa đơn không được âm.');
        }
        $invoice->total_amount = $amount;
        $invoice->save();
    }

    private function canonical(mixed $value): string
    {
        $sort = function ($node) use (&$sort) {
            if (is_array($node)) {
                if (! array_is_list($node)) {
                    ksort($node);
                }

                return array_map($sort, $node);
            }

            return $node;
        };

        return json_encode($sort($value), JSON_THROW_ON_ERROR);
    }

    public function today(): string
    {
        return now(config('app.business_timezone'))->format('Y-m-d');
    }

    private function invalid(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
