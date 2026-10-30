<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\InspectionResult;
use App\Enums\InvoiceItemType;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Enums\MeterReadingKind;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\ContractService as ContractServiceModel;
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
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

/** Creates a final invoice draft and its final readings in one rollback-safe transaction. */
class ContractFinalInvoiceService
{
    public function __construct(
        private readonly FinalMeterReadingPreviewService $meters,
        private readonly ContractTerminationFeeCalculator $fees,
        private readonly FinalInvoiceCalculationService $calculator,
        private readonly InvoiceService $invoices,
    ) {}

    public function ensureReady(): void
    {
        $this->meters->ensureReady();
        abort_unless(Schema::hasColumns('contracts', ['inspection_result', 'inspected_by', 'inspected_at', 'inspection_note'])
            && Schema::hasTable('attachments') && Schema::hasTable('invoices') && Schema::hasTable('invoice_items') && Schema::hasTable('payments'),
            503, 'Cấu trúc hóa đơn tất toán chưa sẵn sàng trên môi trường này.');
    }

    /** @param array<string, mixed> $data */
    public function create(Contract $original, User $actor, array $data): Invoice
    {
        $this->ensureReady();
        $stored = [];

        try {
            foreach ($data['damages'] ?? [] as $index => $damage) {
                foreach ($data['damage_photos'][$index] ?? [] as $photoIndex => $photo) {
                    $stored['damages'][$index][$photoIndex] = $this->store($photo, 'contracts/'.$original->id.'/damage');
                }
            }
            foreach ($data['waiver_evidence'] ?? [] as $index => $photo) {
                $stored['waiver_evidence'][$index] = $this->store($photo, 'contracts/'.$original->id.'/waiver');
            }

            $id = $this->createLocked($original, $actor, $data, $stored);
        } catch (Throwable $failure) {
            foreach ($stored as $collection) {
                foreach ($collection as $files) {
                    foreach (is_array($files) ? $files : [$files] as $path) {
                        Storage::disk('private')->delete($path);
                    }
                }
            }
            if ($failure instanceof QueryException) {
                report(new RuntimeException('Không thể tạo hóa đơn tất toán do lỗi CSDL.'));
                abort(500, 'Không thể tạo hóa đơn tất toán lúc này. Vui lòng thử lại sau.');
            }
            if ($failure instanceof InvalidArgumentException) {
                throw ValidationException::withMessages(['actual_end_date' => $failure->getMessage()]);
            }

            throw $failure;
        }

        // A failed response read must not delete evidence from a committed transaction.
        return $this->invoices->find($id);
    }

    /** @param array<string, mixed> $data @param array<string, mixed> $stored */
    private function createLocked(Contract $original, User $actor, array $data, array $stored): int
    {
        try {
            $id = DB::transaction(function () use ($original, $actor, $data, $stored): int {
                $room = Room::whereKey($original->room_id)->lockForUpdate()->firstOrFail();
                $tenantIds = Contract::withTrashed()->where('room_id', $original->room_id)->pluck('user_id')->all();
                $users = User::whereIn('id', array_values(array_unique([...$tenantIds, $actor->id])))
                    ->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $contracts = Contract::withTrashed()->where('room_id', $original->room_id)->orderBy('id')->lockForUpdate()->get();
                $contract = $contracts->firstWhere('id', $original->id) ?? abort(404);
                $admin = $users->get($actor->id);
                abort_unless($admin !== null && $admin->isActive() && $admin->hasRole(UserRole::Admin), 403);
                abort_unless($contract->room_id === $original->room_id && $contract->user_id === $original->user_id, 409,
                    'Hợp đồng vừa thay đổi. Vui lòng tải lại.');
                abort_unless($contract->status === ContractStatus::Active && $contract->activated_at !== null && ! $contract->trashed(),
                    409, 'Chỉ lập hóa đơn tất toán cho hợp đồng đang hiệu lực.');
                abort_unless($contract->inspection_result !== null && $contract->inspected_by !== null && $contract->inspected_at !== null,
                    409, 'Cần kiểm kê tài sản trước khi lập hóa đơn tất toán.');
                abort_unless(hash_equals($contract->lifecycleRevision(), $data['expected_revision']), 409,
                    'Hợp đồng vừa thay đổi. Vui lòng tải lại.');
                $contract->setRelation('contractServices', ContractServiceModel::where('contract_id', $contract->id)
                    ->orderBy('id')->lockForUpdate()->get());

                $meterInput = array_intersect_key($data, array_flip([
                    'actual_end_date', 'closure_note', 'expected_revision', 'electricity_reading', 'water_reading',
                ]));
                abort_if($data['actual_end_date'] > now(config('app.business_timezone'))->format('Y-m-d'), 422,
                    'Ngày bàn giao thực tế không được nằm trong tương lai.');
                $meterPreview = $this->meters->preview($contract, $admin, $meterInput);
                $this->validateDamageInput($contract, $data['damages'] ?? [], $data['damage_photos'] ?? []);

                $fee = $meterPreview['early_termination_fee'];
                if (isset($data['waiver_code'])) {
                    abort_if($fee === 0 || $contract->early_termination_waiver_code !== null, 422,
                        'Chỉ áp dụng miễn phí một lần khi có khoản phí trước hạn.');
                    $conditions = $contract->early_termination_waiver_conditions ?? [];
                    $matches = array_filter(is_array($conditions) ? $conditions : [], fn ($condition): bool => is_array($condition)
                        && ($condition['code'] ?? null) === $data['waiver_code']
                        && is_string($condition['description'] ?? null) && trim($condition['description']) !== '');
                    abort_unless(count($matches) === 1 && trim($data['waiver_note']) !== '', 422,
                        'Điều kiện miễn phí phải thuộc snapshot hợp đồng và có căn cứ.');
                    $contract->early_termination_waiver_code = $data['waiver_code'];
                    $contract->early_termination_waived_by = $admin->id;
                    $contract->early_termination_waived_at = now();
                    $contract->early_termination_waiver_note = trim($data['waiver_note']);
                    $fee = $this->fees->calculate($contract, $data['actual_end_date']);
                    abort_unless($fee === 0, 409, 'Điều kiện miễn phí không được áp dụng.');
                } elseif (isset($data['waiver_note']) || isset($data['waiver_evidence'])) {
                    throw ValidationException::withMessages(['waiver_code' => 'Cần chọn điều kiện miễn phí đã thỏa thuận trong hợp đồng.']);
                }

                $serviceLines = $contract->contractServices;
                $services = Service::whereIn('id', $serviceLines->pluck('service_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $serviceLines->each(fn ($line) => $line->setRelation('service', $services->get($line->service_id)));
                $roomReadings = MeterReading::where('room_id', $room->id)->whereIn('service_id', $services->pluck('id'))
                    ->orderBy('id')->lockForUpdate()->get();
                $createdMeters = [];
                foreach ($meterPreview['readings'] as $readingData) {
                    $service = $services->firstWhere('code', $readingData['service_code']);
                    abort_unless($service !== null, 503, 'Danh mục Điện/Nước chưa sẵn sàng.');
                    $reading = new MeterReading(['room_id' => $contract->room_id, 'service_id' => $service->id,
                        'period' => $meterPreview['period'], 'reading_date' => $data['actual_end_date'],
                        'current_reading' => $readingData['current_reading']]);
                    $reading->kind = MeterReadingKind::Final;
                    $reading->contract_id = $contract->id;
                    $reading->previous_reading = $readingData['previous_reading'];
                    $reading->consumption = $readingData['consumption'];
                    $reading->unit_price = $readingData['unit_price'];
                    $reading->amount = $readingData['amount'];
                    $reading->save();
                    $reading->setRelation('service', $service);
                    $createdMeters[] = $reading;
                }

                foreach ($stored['waiver_evidence'] ?? [] as $index => $path) {
                    $this->attach($contract, Attachment::CONTRACT_WAIVER_EVIDENCE, $path,
                        'contract-'.$contract->id.'-waiver-'.($index + 1).'.'.$this->extension($path), $index);
                }
                $damages = [];
                foreach ($data['damages'] ?? [] as $index => $damage) {
                    $attachmentIds = [];
                    $photos = $stored['damages'][$index] ?? [];
                    abort_if($photos === [], 422, 'Mỗi hạng mục bồi thường cần ít nhất một ảnh private.');
                    foreach ($photos as $photoIndex => $path) {
                        $attachmentIds[] = $this->attach($contract, Attachment::CONTRACT_DAMAGE_PHOTO, $path,
                            'contract-'.$contract->id.'-damage-'.($index + 1).'-'.($photoIndex + 1).'.'.$this->extension($path),
                            (int) ($contract->attachments()->where('collection', Attachment::CONTRACT_DAMAGE_PHOTO)->max('sort_order') ?? -1) + 1);
                    }
                    $damages[] = ['description' => trim($damage['description']), 'reason' => trim($damage['reason']),
                        'basis' => trim($damage['basis']), 'amount' => (int) $damage['amount'], 'attachment_ids' => $attachmentIds];
                }

                $invoices = Invoice::where('contract_id', $contract->id)->orderBy('id')->lockForUpdate()->get();
                abort_if($invoices->contains(fn (Invoice $invoice) => $invoice->type === InvoiceType::Final
                    && $invoice->status !== InvoiceStatus::Cancelled), 409, 'Hợp đồng đã có hóa đơn tất toán chưa hủy.');
                abort_if($invoices->contains(fn (Invoice $invoice) => $invoice->type === InvoiceType::Final
                    && $invoice->status === InvoiceStatus::Cancelled), 409, 'Hóa đơn tất toán đã hủy cần được lập lại theo bản đã lưu; chưa hỗ trợ thay dữ liệu.');

                $hasPendingPayments = DB::table('payments')->whereIn('invoice_id', $invoices->modelKeys())
                    ->where('status', PaymentStatus::Pending->value)->lockForUpdate()->exists();
                abort_if($hasPendingPayments, 409, 'Cần đối soát hoặc từ chối khoản thanh toán đang chờ trước khi lập hóa đơn tất toán.');
                $invoice = new Invoice(['contract_id' => $contract->id, 'type' => InvoiceType::Final, 'period' => $meterPreview['period']]);
                $invoice->save();

                $finalReadings = [];
                foreach ($createdMeters as $reading) {
                    $finalReadings[] = ['id' => $reading->id, 'service_code' => $reading->service->code,
                        'service_name' => $reading->service->name, 'unit' => $reading->service->unit,
                        'previous_reading' => $reading->previous_reading, 'current_reading' => $reading->current_reading,
                        'consumption' => $reading->consumption, 'unit_price' => $reading->unit_price, 'amount' => $reading->amount];
                }
                $readingState = $roomReadings->merge($createdMeters);
                $calculation = $this->calculator->calculate($contract, $data['actual_end_date'], $meterPreview['period'],
                    $serviceLines, $readingState, $invoices, $finalReadings, $fee, $damages);
                foreach ($calculation['items'] as $item) {
                    $invoice->items()->create($item);
                }
                $invoice->total_amount = $calculation['amount'];
                $invoice->save();
                $meterIds = $calculation['meter_ids'];
                MeterReading::whereIn('id', $meterIds)->update(['invoice_id' => $invoice->id]);

                $contract->actual_end_date = $data['actual_end_date'];
                $contract->closure_reason = $meterPreview['closure_reason'];
                $contract->closure_note = trim($data['closure_note'] ?? '');
                $contract->save();
                $this->invoices->syncFinalRefundNote($contract, $calculation['refund_outside_system_amount']);

                return $invoice->id;
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Hóa đơn hoặc chỉ số chốt vừa được tạo bởi thao tác khác. Vui lòng tải lại.');
        }

        return $id;
    }

    public function reissue(Invoice $original, User $actor, string $revision): Invoice
    {
        $this->ensureReady();

        try {
            $id = DB::transaction(function () use ($original, $actor, $revision): int {
                $contractHint = Contract::withTrashed()->findOrFail($original->contract_id);
                Room::whereKey($contractHint->room_id)->lockForUpdate()->firstOrFail();
                $tenantIds = Contract::withTrashed()->where('room_id', $contractHint->room_id)->pluck('user_id')->all();
                $users = User::whereIn('id', array_values(array_unique([...$tenantIds, $actor->id])))
                    ->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $contracts = Contract::withTrashed()->where('room_id', $contractHint->room_id)->orderBy('id')->lockForUpdate()->get();
                $contract = $contracts->firstWhere('id', $original->contract_id) ?? abort(404);
                $admin = $users->get($actor->id);
                abort_unless($admin !== null && $admin->isActive() && $admin->hasRole(UserRole::Admin), 403);
                abort_unless($contract->status === ContractStatus::Active && $contract->activated_at !== null
                    && ! $contract->trashed() && $contract->actual_end_date !== null && $contract->inspection_result !== null,
                    409, 'Chỉ lập lại hóa đơn tất toán cho hợp đồng đang hiệu lực và đã kiểm kê.');

                $subscriptions = ContractServiceModel::where('contract_id', $contract->id)->orderBy('id')->lockForUpdate()->get();
                $contract->setRelation('contractServices', $subscriptions);
                $services = Service::whereIn('id', $subscriptions->pluck('service_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $subscriptions->each(fn ($line) => $line->setRelation('service', $services->get($line->service_id)));
                $readings = MeterReading::where('contract_id', $contract->id)->orderBy('id')->lockForUpdate()->get();
                $readings->each(fn ($reading) => $reading->setRelation('service', $services->get($reading->service_id)));
                $invoices = Invoice::where('contract_id', $contract->id)->orderBy('id')->lockForUpdate()->get();
                $source = $invoices->firstWhere('id', $original->id) ?? abort(404);
                abort_unless($source->type === InvoiceType::Final && $source->status === InvoiceStatus::Cancelled,
                    409, 'Chỉ lập lại hóa đơn tất toán đã hủy.');
                abort_unless(hash_equals($source->revision(), $revision), 409, 'Hóa đơn đã thay đổi. Vui lòng tải lại.');
                abort_if($invoices->contains(fn (Invoice $candidate) => $candidate->type === InvoiceType::Final
                    && $candidate->status !== InvoiceStatus::Cancelled), 409, 'Hợp đồng đã có hóa đơn tất toán chưa hủy.');
                abort_if($invoices->contains(fn (Invoice $candidate) => $candidate->related_invoice_id === $source->id), 409,
                    'Hóa đơn tất toán này đã được lập lại.');
                $items = InvoiceItem::where('invoice_id', $source->id)->orderBy('id')->lockForUpdate()->get();
                $source->setRelation('items', $items);
                $payments = Payment::whereIn('invoice_id', $invoices->modelKeys())->orderBy('id')->lockForUpdate()->get();
                abort_if($payments->contains(fn (Payment $payment) => $payment->status === PaymentStatus::Pending), 409,
                    'Cần đối soát hoặc từ chối khoản thanh toán đang chờ trước khi lập lại hóa đơn tất toán.');
                abort_if($payments->contains(fn (Payment $payment) => $payment->invoice_id === $source->id
                    && $payment->status === PaymentStatus::Confirmed), 409,
                    'Hóa đơn tất toán đã có tiền xác nhận; cần quy trình điều chỉnh.');
                abort_if($source->paid_amount > 0, 409, 'Hóa đơn tất toán có số tiền đã đối soát; cần quy trình điều chỉnh.');

                $date = $contract->actual_end_date->format('Y-m-d');
                $period = CarbonImmutable::parse($date, config('app.business_timezone'))->startOfMonth()->format('Y-m-d');
                abort_unless($source->period->format('Y-m-d') === $period, 409, 'Kỳ của hóa đơn đã hủy không khớp ngày bàn giao.');
                $finalMeters = $readings->where('kind', MeterReadingKind::Final)->sortBy('service_id')->values();
                abort_unless($finalMeters->count() === 2 && $finalMeters->every(fn (MeterReading $reading) => $reading->invoice_id === null
                    && $reading->reading_date->format('Y-m-d') === $date && $reading->period->format('Y-m-d') === $period),
                    409, 'Hai chỉ số chốt của hóa đơn đã hủy không còn nguyên vẹn.');
                $finalReadings = $finalMeters->map(fn (MeterReading $reading) => [
                    'id' => $reading->id, 'service_code' => $reading->service?->code, 'service_name' => $reading->service?->name,
                    'unit' => $reading->service?->unit, 'previous_reading' => $reading->previous_reading,
                    'current_reading' => $reading->current_reading, 'consumption' => $reading->consumption,
                    'unit_price' => $reading->unit_price, 'amount' => $reading->amount,
                ])->all();
                $damages = $items->where('item_type', InvoiceItemType::Damage)->map(fn (InvoiceItem $item) => [
                    'description' => $item->description, 'reason' => $item->meta['reason'] ?? '',
                    'basis' => $item->meta['basis'] ?? '', 'amount' => $item->amount,
                    'attachment_ids' => $item->meta['attachment_ids'] ?? [],
                ])->values()->all();
                $damageAttachmentIds = collect($damages)->flatMap(fn (array $damage) => $damage['attachment_ids'])->unique()->sort()->values()->all();
                if ($damages !== []) {
                    $validDamageIds = Attachment::query()->where('attachable_type', 'contract')->where('attachable_id', $contract->id)
                        ->where('collection', Attachment::CONTRACT_DAMAGE_PHOTO)->where('disk', 'private')
                        ->whereIn('id', $damageAttachmentIds)->orderBy('id')->pluck('id')->all();
                    abort_unless($damageAttachmentIds !== [] && $validDamageIds === $damageAttachmentIds,
                        409, 'Ảnh căn cứ bồi thường của hóa đơn đã hủy không còn hợp lệ.');
                }
                if ($contract->early_termination_waiver_code !== null) {
                    abort_unless(trim((string) $contract->early_termination_waiver_note) !== ''
                        && $contract->attachments()->where('collection', Attachment::CONTRACT_WAIVER_EVIDENCE)
                            ->where('disk', 'private')->exists(), 409,
                        'Ảnh căn cứ miễn phí của hợp đồng không còn hợp lệ.');
                }
                $manualItems = $items->filter(fn (InvoiceItem $item) => ($item->meta['source'] ?? null) === 'manual');
                $calculation = $this->calculator->calculate($contract, $date, $period, $subscriptions, $readings, $invoices,
                    $finalReadings, $this->fees->calculate($contract, $date), $damages, null, Money::sum($manualItems->pluck('amount')->all()));

                $invoice = new Invoice(['contract_id' => $contract->id, 'type' => InvoiceType::Final, 'period' => $period]);
                $invoice->related_invoice_id = $source->id;
                $invoice->save();
                foreach ($calculation['items'] as $item) {
                    $invoice->items()->create($item);
                }
                foreach ($manualItems as $item) {
                    $invoice->items()->create(['item_type' => $item->item_type->value, 'description' => $item->description,
                        'quantity' => $item->quantity, 'unit_price' => $item->unit_price, 'amount' => $item->amount, 'meta' => $item->meta]);
                }
                $invoice->total_amount = Money::sum([...array_column($calculation['items'], 'amount'), ...$manualItems->pluck('amount')->all()]);
                abort_if($invoice->total_amount < 0, 409, 'Tổng hóa đơn tất toán không được âm.');
                $invoice->save();
                $this->invoices->syncFinalRefundNote($contract, $calculation['refund_outside_system_amount']);
                MeterReading::whereIn('id', $calculation['meter_ids'])->whereNull('invoice_id')->update(['invoice_id' => $invoice->id]);

                return $invoice->id;
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Hóa đơn hoặc chỉ số chốt vừa được lập lại bởi thao tác khác. Vui lòng tải lại.');
        } catch (QueryException) {
            report(new RuntimeException('Không thể lập lại hóa đơn tất toán do lỗi CSDL.'));
            abort(500, 'Không thể lập lại hóa đơn tất toán lúc này. Vui lòng thử lại sau.');
        } catch (InvalidArgumentException $failure) {
            throw ValidationException::withMessages(['actual_end_date' => $failure->getMessage()]);
        }

        return $this->invoices->find($id);
    }

    /** @param array<int, array<string, mixed>> $damages */
    private function validateDamageInput(Contract $contract, array $damages, array $photos): void
    {
        abort_if(array_diff(array_keys($photos), array_keys($damages)) !== [], 422,
            'Ảnh căn cứ phải gắn đúng với hạng mục bồi thường.');
        abort_if($damages === [] && $photos !== [], 422, 'Ảnh bồi thường phải gắn với một hạng mục có căn cứ.');
        if ($contract->inspection_result === InspectionResult::NoDamage) {
            abort_if($damages !== [], 422, 'Kết quả không có hư hỏng nên không được thêm khoản bồi thường.');
        } elseif ($contract->inspection_result === InspectionResult::Damaged) {
            abort_if($damages === [], 422, 'Cần nhập ít nhất một hạng mục bồi thường có căn cứ và ảnh.');
            foreach (array_keys($damages) as $index) {
                abort_if(empty($photos[$index]), 422, 'Mỗi hạng mục bồi thường cần ít nhất một ảnh private.');
            }
        } else {
            abort(409, 'Kết quả kiểm kê tài sản chưa hợp lệ.');
        }
    }

    private function store(UploadedFile $photo, string $directory): string
    {
        $path = $photo->store($directory, 'private');
        abort_unless(is_string($path) && $path !== '', 500, 'Không thể lưu ảnh riêng tư lúc này.');

        return $path;
    }

    private function attach(Contract $contract, string $collection, string $path, string $name, int $sortOrder): int
    {
        $attachment = new Attachment;
        $attachment->collection = $collection;
        $attachment->disk = 'private';
        $attachment->path = $path;
        $attachment->original_name = $name;
        $attachment->mime_type = match ($this->extension($path)) {
            'jpg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', default => abort(422, 'Định dạng ảnh không hợp lệ.'),
        };
        $attachment->size_bytes = Storage::disk('private')->size($path);
        $attachment->sort_order = $sortOrder;
        $contract->attachments()->save($attachment);

        return $attachment->id;
    }

    private function extension(string $path): string
    {
        return strtolower(pathinfo($path, PATHINFO_EXTENSION));
    }
}
