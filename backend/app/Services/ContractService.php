<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\DepositStatus;
use App\Enums\MeterReadingKind;
use App\Enums\RoomStatus;
use App\Enums\ServiceBillingType;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ContractService
{
    private const WRITABLE_FIELDS = ['room_id', 'user_id', 'start_date', 'end_date', 'monthly_rent', 'deposit_amount', 'occupant_count', 'note'];

    public function ensureReady(): void
    {
        foreach (['contracts', 'rooms', 'users', 'buildings', 'contract_occupants', 'contract_services'] as $table) {
            if (! Schema::hasTable($table)) {
                abort(503, 'Dữ liệu hợp đồng chưa được triển khai đầy đủ trên môi trường này. Vui lòng liên hệ quản trị viên.');
            }
        }
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        return $this->listing($filters)['page'];
    }

    /**
     * Danh sách kèm số đếm từng tab. Số đếm dùng cùng bộ lọc phòng/tòa/người thuê/từ khóa nhưng bỏ qua tab,
     * nên khớp đúng số dòng khi bấm tab; không lọc trên dữ liệu một trang.
     *
     * @return array{page: LengthAwarePaginator, counts: array<string, int>, due: array{today: string, expiring_until: string, expiring_warning_days: int}}
     */
    public function listing(array $filters): array
    {
        $this->ensureReady();
        $due = $this->dueWindow();
        $query = $this->query();
        $this->applyScopeFilters($query, $filters);
        $active = ContractStatus::Active->value;
        $counts = (clone $query)->toBase()->selectRaw(
            'COUNT(*) AS all_count, COALESCE(SUM(status = ?), 0) AS draft_count, COALESCE(SUM(status = ?), 0) AS active_count, '
            .'COALESCE(SUM(status = ? AND end_date < ?), 0) AS overdue_count, COALESCE(SUM(status = ? AND end_date BETWEEN ? AND ?), 0) AS expiring_count, '
            .'COALESCE(SUM(status = ?), 0) AS terminated_count, COALESCE(SUM(status = ?), 0) AS expired_count',
            [ContractStatus::Draft->value, $active, $active, $due['today'], $active, $due['today'], $due['expiring_until'],
                ContractStatus::Terminated->value, ContractStatus::Expired->value],
        )->first();
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['due'])) {
            // Quá hạn/sắp hết hạn chỉ là nhãn suy ra từ ngày cuối được ở; hợp đồng vẫn active (DB-D43, BR-CTR-09).
            $query->where('status', $active);
            $filters['due'] === 'overdue'
                ? $query->where('end_date', '<', $due['today'])
                : $query->whereBetween('end_date', [$due['today'], $due['expiring_until']]);
        }

        return [
            'page' => $query->orderBy('id')->paginate(20, ['*'], 'page', (int) ($filters['page'] ?? 1))->appends($filters),
            'counts' => ['all' => (int) $counts->all_count, 'draft' => (int) $counts->draft_count, 'active' => (int) $counts->active_count,
                'expiring' => (int) $counts->expiring_count, 'overdue' => (int) $counts->overdue_count, 'terminated' => (int) $counts->terminated_count,
                'expired' => (int) $counts->expired_count],
            'due' => $due,
        ];
    }

    /** Ngày lịch Việt Nam; "sắp hết hạn" = ngày cuối được ở trong [hôm nay, hôm nay + contract.expiring_warning_days]. */
    private function dueWindow(): array
    {
        $today = CarbonImmutable::now(config('app.business_timezone'))->startOfDay();
        $stored = Schema::hasTable('settings') ? Setting::where('key', 'contract.expiring_warning_days')->value('value') : null;
        $days = is_string($stored) && preg_match('/^[1-9]\d{0,2}$/', $stored) === 1 && (int) $stored <= 365
            ? (int) $stored : (int) SettingService::DEFAULT_SETTINGS['contract.expiring_warning_days']['value'];

        return ['today' => $today->format('Y-m-d'), 'expiring_until' => $today->addDays($days)->format('Y-m-d'), 'expiring_warning_days' => $days];
    }

    private function applyScopeFilters(Builder $query, array $filters): void
    {
        foreach (['room_id', 'user_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (isset($filters['building_id'])) {
            $query->whereHas('room', fn (Builder $room) => $room->where('building_id', $filters['building_id']));
        }
        if (isset($filters['q']) && $filters['q'] !== '') {
            $query->where(function (Builder $search) use ($filters): void {
                // Tìm chuỗi literal, không biến % và _ thành wildcard; mọi giá trị đều có binding.
                $search->whereRaw('LOCATE(?, contracts.contract_number) > 0', [$filters['q']])
                    ->orWhereHas('room', fn (Builder $room) => $room->whereRaw('LOCATE(?, rooms.code) > 0', [$filters['q']]))
                    ->orWhereHas('tenant', function (Builder $tenant) use ($filters): void {
                        $tenant->whereRaw('LOCATE(?, users.full_name) > 0', [$filters['q']])
                            ->orWhereRaw('LOCATE(?, users.email) > 0', [$filters['q']])
                            ->orWhereRaw('LOCATE(?, users.phone) > 0', [$filters['q']]);
                    });
            });
        }
    }

    public function find(string|int $id): Contract
    {
        $this->ensureReady();
        $contract = $this->query(true)->findOrFail($id);
        if (Schema::hasColumns('contracts', ['inspection_result', 'inspected_by', 'inspected_at', 'inspection_note'])
            && Schema::hasTable('attachments')) {
            $contract->load(['attachments' => fn ($attachments) => $attachments->where('disk', 'private')->orderBy('sort_order')->orderBy('id')]);
        }

        return $contract;
    }

    public function create(#[\SensitiveParameter] array $data): Contract
    {
        $this->ensureReady();

        try {
            return DB::transaction(function () use ($data): Contract {
                [$rooms, $users] = $this->lockParents([(int) $data['room_id']], [(int) $data['user_id']]);
                $room = $rooms[(int) $data['room_id']];
                $tenant = $users[(int) $data['user_id']];
                $this->validateDraftData($room, $tenant, $data);

                $contract = new Contract(Arr::only($data, self::WRITABLE_FIELDS));
                $contract->status = ContractStatus::Draft;
                $contract->deposit_status = DepositStatus::Unpaid;
                $contract->contract_number = null;
                $contract->save();

                return $this->query(true)->findOrFail($contract->id);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Dữ liệu hợp đồng vừa xung đột. Vui lòng tải lại và thử lại.');
        } catch (QueryException) {
            $this->databaseFailure('tạo');
        }
    }

    public function update(Contract $contract, #[\SensitiveParameter] array $data): Contract
    {
        $this->ensureReady();

        try {
            return DB::transaction(function () use ($contract, $data): Contract {
                [$rooms, $users] = $this->lockParents(
                    [$contract->room_id, (int) ($data['room_id'] ?? $contract->room_id)],
                    [$contract->user_id, (int) ($data['user_id'] ?? $contract->user_id)],
                );
                $current = Contract::query()->whereKey($contract->id)->lockForUpdate()->firstOrFail();
                $this->ensureUnchangedParents($contract, $current);
                $this->ensureDraft($current);

                // PATCH kiểm tra tập dữ liệu sau ghép, không chỉ các ô vừa gửi.
                $merged = array_replace(Arr::only($current->getRawOriginal(), self::WRITABLE_FIELDS), Arr::only($data, self::WRITABLE_FIELDS));
                if ($current->deposit_status !== DepositStatus::Unpaid) {
                    foreach (['room_id', 'user_id', 'deposit_amount'] as $field) {
                        if ((string) $merged[$field] !== (string) $current->getRawOriginal($field)) {
                            abort(409, 'Đã nhận tiền cọc: không được đổi phòng, người thuê hoặc số tiền cọc khi chưa có quy trình hoàn cọc.');
                        }
                    }
                }
                $this->validateDraftData($rooms[(int) $merged['room_id']], $users[(int) $merged['user_id']], $merged);
                $this->validateOccupantCapacity($current, $rooms[(int) $merged['room_id']]);
                if ($merged['start_date'] !== $current->getRawOriginal('start_date')) {
                    foreach ($this->lockSimpleDraftServices($current) as $line) {
                        $line->start_date = $merged['start_date'];
                        $line->save();
                    }
                }
                $current->fill(Arr::only($data, self::WRITABLE_FIELDS));
                $current->save();

                return $this->query(true)->findOrFail($current->id);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Dữ liệu hợp đồng vừa xung đột. Vui lòng tải lại và thử lại.');
        } catch (QueryException) {
            $this->databaseFailure('cập nhật');
        }
    }

    /** Nháp: thay tập dịch vụ soạn thảo. Đang hiệu lực: thay đổi áp dụng từ ngày 01 tháng sau (DB09 §3.11, brief §8.1b). */
    public function updateServices(Contract $contract, array $data): Contract
    {
        return $contract->status === ContractStatus::Active
            ? $this->changeActiveServices($contract, $data)
            : $this->updateDraftServices($contract, $data);
    }

    /**
     * Dòng đang hiệu lực đóng vào ngày cuối tháng hiện tại, dòng mới bắt đầu 01 tháng sau; dòng đã lưu giữ đơn giá snapshot
     * khi chỉ đổi số lượng (như quy tắc nháp brief §25), dịch vụ thêm mới lấy giá danh mục (DB-D59). Không sửa hóa đơn đã lập.
     */
    private function changeActiveServices(Contract $contract, array $data): Contract
    {
        $this->ensureReady();
        if (! isset($data['expected_revision'])) {
            throw ValidationException::withMessages(['expected_revision' => 'Vui lòng tải lại hợp đồng trước khi thay đổi dịch vụ.']);
        }
        try {
            return DB::transaction(function () use ($contract, $data): Contract {
                $this->lockParents([$contract->room_id], [$contract->user_id]);
                $current = Contract::whereKey($contract->id)->lockForUpdate()->firstOrFail();
                $this->ensureUnchangedParents($contract, $current);
                if ($current->status !== ContractStatus::Active || $current->actual_end_date !== null) {
                    abort(409, 'Chỉ thay dịch vụ cho hợp đồng đang hiệu lực chưa bắt đầu bàn giao. Vui lòng tải lại.');
                }
                $this->assertLifecycleRevision($current, $data['expected_revision']);
                $lines = $current->contractServices->load('service');
                $nextMonth = CarbonImmutable::now(config('app.business_timezone'))->startOfMonth()->addMonth();
                $from = max($nextMonth->format('Y-m-d'), $current->start_date->format('Y-m-d'));
                $fromMonth = CarbonImmutable::parse($from)->startOfMonth()->format('Y-m-d');
                if (Schema::hasTable('invoices') && DB::table('invoices')->where('contract_id', $current->id)
                    ->where('status', '!=', 'cancelled')->where('period', '>=', $fromMonth)->lockForUpdate()->exists()) {
                    abort(409, 'Đã có hóa đơn cho kỳ '.CarbonImmutable::parse($fromMonth)->format('m/Y').' trở đi. Thay đổi dịch vụ không được làm thay đổi hóa đơn đã lập.');
                }
                $periodic = $lines->reject(fn ($line) => $line->service->isMetered()
                    || in_array($line->service->code, [Service::CODE_ELECTRICITY, Service::CODE_WATER], true));
                if ($periodic->contains(fn ($line) => $line->start_date->format('Y-m-d') > $from)) {
                    abort(409, 'Dịch vụ hợp đồng có khoảng hiệu lực bất thường. Vui lòng kiểm tra dữ liệu.');
                }
                $covering = $periodic->filter(fn ($line) => $line->start_date->format('Y-m-d') <= $from
                    && ($line->end_date === null || $line->end_date->format('Y-m-d') >= $from));
                if ($covering->unique('service_id')->count() !== $covering->count()) {
                    abort(409, 'Dịch vụ đã có nhiều khoảng hiệu lực chồng nhau. Vui lòng kiểm tra dữ liệu hợp đồng.');
                }
                $covering = $covering->keyBy('service_id');
                $ids = array_map(fn (array $line): int => (int) $line['service_id'], $data['services']);
                if (count(array_unique($ids)) !== count($ids)) {
                    throw ValidationException::withMessages(['services' => 'Không được chọn trùng dịch vụ.']);
                }
                $catalog = Service::whereIn('id', $ids)->orderBy('id')->sharedLock()->get()->keyBy('id');
                foreach ($data['services'] as $index => $input) {
                    $service = $catalog->get((int) $input['service_id']);
                    $line = $covering->get((int) $input['service_id']);
                    if (! $service || $service->isMetered() || in_array($service->code, [Service::CODE_ELECTRICITY, Service::CODE_WATER], true)) {
                        throw ValidationException::withMessages(["services.$index.service_id" => 'Chỉ thay dịch vụ định kỳ; Điện/Nước tính theo chỉ số và không đổi tại đây.']);
                    }
                    if ($service->billing_type === ServiceBillingType::PerRoom && (int) $input['quantity'] !== 1) {
                        throw ValidationException::withMessages(["services.$index.quantity" => 'Dịch vụ theo phòng phải có số lượng bằng 1.']);
                    }
                    $unchanged = $line && bccomp((string) $line->quantity, (string) $input['quantity'], 2) === 0;
                    if (! $unchanged && $service->status !== ServiceStatus::Active) {
                        throw ValidationException::withMessages(["services.$index.service_id" => 'Dịch vụ đã ngừng hoạt động chỉ được giữ nguyên hoặc ngừng sử dụng.']);
                    }
                    if (! $line && ($service->price === null || $service->price < 0 || $service->price > 9007199254740991)) {
                        throw ValidationException::withMessages(["services.$index.service_id" => 'Dịch vụ chưa có đơn giá hợp lệ.']);
                    }
                }
                $lastOldDay = CarbonImmutable::parse($from)->subDay()->format('Y-m-d');
                $changed = false;
                foreach ($covering as $id => $line) {
                    $input = collect($data['services'])->first(fn (array $row) => (int) $row['service_id'] === (int) $id);
                    if ($input && bccomp((string) $line->quantity, (string) $input['quantity'], 2) === 0) {
                        continue;
                    }
                    $changed = true;
                    if ($line->start_date->format('Y-m-d') >= $from) {
                        // Dòng chưa từng có hiệu lực (bắt đầu từ kỳ áp dụng): sửa trực tiếp, không tạo lịch sử giả.
                        $input ? $line->forceFill(['quantity' => $input['quantity']])->save() : $line->delete();

                        continue;
                    }
                    $line->forceFill(['end_date' => $lastOldDay])->save();
                    if ($input) {
                        $current->contractServices()->create(['service_id' => $id, 'quantity' => $input['quantity'],
                            'unit_price' => $line->unit_price, 'start_date' => $from, 'end_date' => null]);
                    }
                }
                foreach ($data['services'] as $input) {
                    $id = (int) $input['service_id'];
                    if (! $covering->has($id)) {
                        $changed = true;
                        $current->contractServices()->create(['service_id' => $id, 'quantity' => $input['quantity'],
                            'unit_price' => $catalog[$id]->price, 'start_date' => $from, 'end_date' => null]);
                    }
                }
                if ($changed) {
                    $current->touch();
                }

                return $this->find($current->id);
            }, 3);
        } catch (QueryException) {
            $this->databaseFailure('thay đổi dịch vụ của');
        }
    }

    /** Chỉ soạn dịch vụ định kỳ của nháp; không kích hoạt hay sửa lịch sử hợp đồng active. */
    private function updateDraftServices(Contract $contract, array $data): Contract
    {
        $this->ensureReady();
        try {
            return DB::transaction(function () use ($contract, $data): Contract {
                $this->lockParents([$contract->room_id], [$contract->user_id]);
                $current = Contract::whereKey($contract->id)->lockForUpdate()->firstOrFail();
                $this->ensureUnchangedParents($contract, $current);
                $this->ensureDraft($current);
                $existing = $this->lockSimpleDraftServices($current)->keyBy('service_id');
                $ids = array_map(fn (array $line): int => (int) $line['service_id'], $data['services']);
                if (count(array_unique($ids)) !== count($ids)) {
                    throw ValidationException::withMessages(['services' => 'Không được chọn trùng dịch vụ.']);
                }
                // Danh mục chỉ giữ khóa chia sẻ: một cập nhật giá phải hoàn tất trước khi chụp giá mới.
                $catalog = Service::whereIn('id', $ids)->orderBy('id')->sharedLock()->get()->keyBy('id');
                foreach ($data['services'] as $index => $input) {
                    $service = $catalog->get((int) $input['service_id']);
                    if (! $service || $service->status !== ServiceStatus::Active || $service->isMetered()
                        || in_array($service->code, [Service::CODE_ELECTRICITY, Service::CODE_WATER], true)) {
                        throw ValidationException::withMessages(["services.$index.service_id" => 'Chỉ chọn dịch vụ định kỳ đang hoạt động. Điện/Nước được thêm khi kích hoạt.']);
                    }
                    if ($service->billing_type === ServiceBillingType::PerRoom && (int) $input['quantity'] !== 1) {
                        throw ValidationException::withMessages(["services.$index.quantity" => 'Dịch vụ theo phòng phải có số lượng bằng 1.']);
                    }
                    if ($service->price === null || $service->price < 0 || $service->price > 9007199254740991) {
                        throw ValidationException::withMessages(["services.$index.service_id" => 'Dịch vụ chưa có đơn giá hợp lệ.']);
                    }
                }
                // Chỉ ghi sau khi kiểm tra toàn bộ mảng, giữ giá snapshot của những dòng còn được chọn.
                foreach ($data['services'] as $input) {
                    $id = (int) $input['service_id'];
                    $line = $existing->get($id);
                    if ($line) {
                        $line->quantity = $input['quantity'];
                        $line->save();
                    } else {
                        $current->contractServices()->create([
                            'service_id' => $id, 'quantity' => $input['quantity'],
                            'unit_price' => $catalog[$id]->price,
                            'start_date' => $current->start_date->format('Y-m-d'), 'end_date' => null,
                        ]);
                    }
                }
                foreach ($existing as $id => $line) {
                    if (! in_array((int) $id, $ids, true)) {
                        $line->delete(); // Chỉ dòng soạn nháp chưa có lịch sử, không đụng hợp đồng active.
                    }
                }
                $current->touch();

                return $this->query(true)->findOrFail($current->id);
            }, 3);
        } catch (QueryException) {
            $this->databaseFailure('lưu dịch vụ của');
        }
    }

    private function lockSimpleDraftServices(Contract $contract): Collection
    {
        $lines = $contract->contractServices()->orderBy('id')->lockForUpdate()->get();
        foreach (['invoices', 'meter_readings'] as $table) {
            if (Schema::hasTable($table) && DB::table($table)->where('contract_id', $contract->id)->exists()) {
                abort(409, 'Bản nháp đã có lịch sử liên quan. Không tự sửa dịch vụ hoặc khoảng hiệu lực.');
            }
        }
        if ($lines->unique('service_id')->count() !== $lines->count()) {
            abort(409, 'Dịch vụ đã có nhiều khoảng hiệu lực. Vui lòng kiểm tra dữ liệu hợp đồng.');
        }
        foreach ($lines as $line) {
            if ($line->end_date !== null || $line->start_date->format('Y-m-d') !== $contract->start_date->format('Y-m-d') || $line->unit_price === null) {
                abort(409, 'Dịch vụ đã có lịch sử hoặc chỉ số. Không tự ghi đè khi soạn nháp.');
            }
        }

        return $lines;
    }

    public function delete(Contract $contract): void
    {
        $this->ensureReady();

        try {
            DB::transaction(function () use ($contract): void {
                $this->lockParents([$contract->room_id], [$contract->user_id]);
                $current = Contract::query()->whereKey($contract->id)->lockForUpdate()->firstOrFail();
                $this->ensureUnchangedParents($contract, $current);
                $this->ensureDraft($current);
                if ($current->deposit_status !== DepositStatus::Unpaid || $current->deposit_paid_at !== null) {
                    abort(409, 'Hợp đồng đã ghi nhận tiền cọc. Không thể xóa khi chưa có quy trình hoàn cọc.');
                }
                if ($current->occupants()->exists() || $current->contractServices()->exists()
                    || Contract::withTrashed()->where('renewed_from_id', $current->id)->exists()) {
                    abort(409, 'Hợp đồng đã có dữ liệu liên quan. Không thể xóa nháp này.');
                }
                // Nhóm 3 chưa có trên dev: không bắt buộc triển khai để quản lý bản nháp.
                foreach (['invoices', 'meter_readings'] as $table) {
                    if (Schema::hasTable($table) && DB::table($table)->where('contract_id', $current->id)->exists()) {
                        abort(409, 'Hợp đồng đã có lịch sử liên quan. Không thể xóa nháp này.');
                    }
                }
                $current->delete();
            }, 3);
        } catch (QueryException) {
            $this->databaseFailure('xóa nháp');
        }
    }

    public function confirmDeposit(Contract $contract, array $data): Contract
    {
        try {
            return DB::transaction(function () use ($contract, $data): Contract {
                $this->lockParents([$contract->room_id], [$contract->user_id]);
                $current = Contract::whereKey($contract->id)->lockForUpdate()->firstOrFail();
                $this->ensureUnchangedParents($contract, $current);
                $this->ensureDraft($current);
                $this->assertLifecycleRevision($current, $data['expected_revision']);
                if ($current->deposit_amount <= 0 || $current->deposit_amount !== (int) $data['expected_amount']) {
                    abort(409, 'Số tiền cọc đã thay đổi hoặc hợp đồng không yêu cầu cọc. Vui lòng tải lại.');
                }
                if ($current->deposit_status === DepositStatus::Held && $current->deposit_paid_at !== null) {
                    return $this->find($current->id); // Lặp lại không ghi nhận tiền hay đổi thời điểm lần nữa.
                }
                if ($current->deposit_status !== DepositStatus::Unpaid || $current->deposit_paid_at !== null) {
                    abort(409, 'Trạng thái cọc không phù hợp để xác nhận thực nhận.');
                }
                $current->deposit_status = DepositStatus::Held;
                $current->deposit_paid_at = now();
                $current->save();

                return $this->find($current->id);
            }, 3);
        } catch (QueryException) {
            $this->databaseFailure('ghi nhận tiền cọc của');
        }
    }

    private function ensureActivationReady(): void
    {
        $this->ensureReady();
        if (! Schema::hasTable('meter_readings') || ! Schema::hasColumns('contracts', ContractTermsService::SNAPSHOT_FIELDS)) {
            abort(503, 'Cấu trúc kích hoạt hợp đồng chưa sẵn sàng. Chưa thể thực hiện trên môi trường này.');
        }
    }

    private function assertLifecycleRevision(Contract $contract, string $expected): void
    {
        $contract->setRelation('contractServices', $contract->contractServices()->orderBy('id')->lockForUpdate()->get());
        if (! hash_equals($contract->lifecycleRevision(), $expected)) {
            abort(409, 'Nội dung hợp đồng hoặc dịch vụ vừa thay đổi. Vui lòng tải lại trước khi xác nhận.');
        }
    }

    /** Mốc hiển thị chỉ để tham khảo; action luôn đọc lại dưới khóa. */
    public function activationContext(Contract $contract): array
    {
        $this->ensureActivationReady();
        $result = [];
        foreach ($this->meteredServices() as $service) {
            $reading = MeterReading::where('room_id', $contract->room_id)->where('service_id', $service->id)
                ->orderByDesc('reading_date')->orderByDesc('id')->first();
            $result[$service->code] = $reading ? [
                'current_reading' => $reading->current_reading, 'reading_date' => $reading->reading_date->format('Y-m-d'),
                'kind' => $reading->kind->value,
            ] : null;
        }

        return $result;
    }

    private function meteredServices(): Collection
    {
        $services = Service::whereIn('code', [Service::CODE_ELECTRICITY, Service::CODE_WATER])->orderBy('id')->get();
        if ($services->count() !== 2 || $services->contains(fn ($service) => ! $service->isMetered()
            || $service->status !== ServiceStatus::Active || $service->price !== null)) {
            abort(503, 'Danh mục Điện/Nước hệ thống chưa được cấu hình hợp lệ.');
        }

        return $services;
    }

    public function activate(Contract $contract, User $actor, array $data): Contract
    {
        $this->ensureActivationReady();
        try {
            return DB::transaction(function () use ($contract, $actor, $data): Contract {
                [$rooms, $users] = $this->lockParents([$contract->room_id], [$contract->user_id]);
                $current = Contract::whereKey($contract->id)->lockForUpdate()->firstOrFail();
                $this->ensureUnchangedParents($contract, $current);
                $this->ensureDraft($current);
                $this->assertLifecycleRevision($current, $data['expected_revision']);
                $room = $rooms[$current->room_id];
                $tenant = $users[$current->user_id];
                $this->validateDraftData($room, $tenant, $current->getRawOriginal());
                $this->validateOccupantCapacity($current, $room);
                app(ContractTermsService::class)->assertSignedTermsAndDeposit($current);
                $prior = Contract::withTrashed()->where('room_id', $room->id)->where('id', '!=', $current->id)
                    ->where('status', '!=', ContractStatus::Draft)->orderByDesc('actual_end_date')->orderByDesc('id')->first();
                if ($prior && ($prior->status !== ContractStatus::Terminated || $prior->actual_end_date === null
                    || $prior->closed_at === null || $prior->actual_end_date->format('Y-m-d') > $current->start_date->format('Y-m-d'))) {
                    abort(409, 'Hợp đồng trước của phòng chưa bàn giao hợp lệ hoặc ngày thuê mới chồng lịch sử.');
                }
                $lines = $this->lockSimpleDraftServices($current);
                $services = $this->meteredServices();
                $hasGap = false;
                foreach ($services as $service) {
                    $field = $service->code === Service::CODE_ELECTRICITY ? 'initial_electricity_reading' : 'initial_water_reading';
                    $latest = MeterReading::where('room_id', $room->id)->where('service_id', $service->id)
                        ->orderByDesc('reading_date')->orderByDesc('id')->lockForUpdate()->first();
                    if ($latest && $latest->reading_date->format('Y-m-d') > $current->start_date->format('Y-m-d')) {
                        throw ValidationException::withMessages([$field => 'Đã có chỉ số sau ngày bắt đầu thuê. Không được kích hoạt ngược chuỗi chỉ số.']);
                    }
                    if ($prior) {
                        $final = MeterReading::where('room_id', $room->id)->where('service_id', $service->id)
                            ->where('contract_id', $prior->id)->where('kind', MeterReadingKind::Final)
                            ->whereDate('reading_date', $prior->actual_end_date->format('Y-m-d'))->lockForUpdate()->first();
                        if (! $final || ! $latest || bccomp($latest->current_reading, $final->current_reading, 2) < 0
                            || ($latest->contract_id !== null && $latest->contract_id !== $prior->id)) {
                            throw ValidationException::withMessages([$field => 'Hợp đồng trước chưa có mốc chốt hoặc chuỗi chỉ số phù hợp. Không suy đoán chỉ số bàn giao.']);
                        }
                    }
                    if ($latest && bccomp($data[$field], $latest->current_reading, 2) < 0) {
                        throw ValidationException::withMessages([$field => 'Chỉ số đầu không được thấp hơn mốc gần nhất '.$latest->current_reading.'.']);
                    }
                    $hasGap = $hasGap || ($latest && bccomp($data[$field], $latest->current_reading, 2) > 0);
                    $current->{$field} = $data[$field];
                }
                if ($hasGap && (! ($data['meter_gap_confirmed'] ?? false) || trim($data['meter_gap_reason'] ?? '') === '')) {
                    throw ValidationException::withMessages(['meter_gap_reason' => 'Chỉ số cao hơn mốc gần nhất: cần lý do và xác nhận chênh lệch không tính cho người thuê.']);
                }
                // Dòng nháp định kỳ giữ nguyên snapshot; không nhận danh sách hoặc giá từ action.
                foreach ($lines as $line) {
                    if ($line->service->isMetered() || $line->service->status !== ServiceStatus::Active) {
                        abort(409, 'Dịch vụ nháp không còn hợp lệ. Vui lòng kiểm tra và lưu lại dịch vụ.');
                    }
                }
                foreach ($services as $service) {
                    $current->contractServices()->create([
                        'service_id' => $service->id, 'quantity' => '1.00', 'unit_price' => null,
                        'start_date' => $current->start_date->format('Y-m-d'), 'end_date' => null,
                    ]);
                }
                $current->status = ContractStatus::Active;
                $current->activated_at = now();
                $current->contract_number = 'HD-'.now(config('app.business_timezone'))->format('Y').'-'.str_pad((string) $current->id, 4, '0', STR_PAD_LEFT);
                $current->meter_gap_reason = $hasGap ? trim($data['meter_gap_reason']) : null;
                $current->meter_gap_confirmed_by = $hasGap ? $actor->id : null;
                $current->save();
                $room->status = RoomStatus::Occupied;
                $room->save();
                $tenant->role = UserRole::Resident;
                $tenant->save();

                return $this->find($current->id);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Phòng hoặc người thuê vừa có hợp đồng đang hiệu lực. Vui lòng tải lại.');
        } catch (QueryException) {
            $this->databaseFailure('kích hoạt');
        }
    }

    /** Khóa cha theo thứ tự rooms → users; nhiều dòng cùng bảng theo ID tăng dần (DB-D29). */
    private function lockParents(array $roomIds, array $userIds): array
    {
        $rooms = Room::query()->whereIn('id', array_unique($roomIds))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        $users = User::query()->whereIn('id', array_unique($userIds))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        if ($rooms->count() !== count(array_unique($roomIds))) {
            throw ValidationException::withMessages(['room_id' => 'Phòng không còn tồn tại. Vui lòng chọn lại.']);
        }
        if ($users->count() !== count(array_unique($userIds))) {
            throw ValidationException::withMessages(['user_id' => 'Tài khoản người thuê không còn tồn tại. Vui lòng chọn lại.']);
        }

        return [$rooms, $users];
    }

    private function ensureUnchangedParents(Contract $before, Contract $current): void
    {
        if ($before->room_id !== $current->room_id || $before->user_id !== $current->user_id) {
            // Không khóa ngược lên phòng/người thuê mới sau khi đã khóa contracts.
            abort(409, 'Phòng hoặc người thuê của bản nháp vừa thay đổi. Vui lòng tải lại và thử lại.');
        }
    }

    private function ensureDraft(Contract $contract): void
    {
        if ($contract->status !== ContractStatus::Draft) {
            abort(409, 'Chỉ được sửa hoặc xóa hợp đồng nháp. Hợp đồng đã có hiệu lực được giữ nguyên.');
        }
    }

    private function validateDraftData(Room $room, User $tenant, #[\SensitiveParameter] array $data): void
    {
        if ($room->status !== RoomStatus::Available || $room->activeContract()->exists()) {
            abort(409, 'Chỉ lập hoặc sửa nháp với phòng đang trống. Vui lòng chọn lại phòng.');
        }
        if (! $tenant->isActive() || ! in_array($tenant->role, [UserRole::User, UserRole::Resident], true)) {
            throw ValidationException::withMessages(['user_id' => 'Người thuê phải là tài khoản Khách hoặc Cư dân đang hoạt động.']);
        }
        if ($tenant->hasActiveContract()) {
            abort(409, 'Người thuê đã có hợp đồng đang hiệu lực. Vui lòng chọn lại.');
        }
        if ($data['end_date'] <= $data['start_date']) {
            throw ValidationException::withMessages(['end_date' => 'Ngày cuối được ở phải sau ngày bắt đầu.']);
        }
        if ((int) $data['occupant_count'] > $room->max_occupants) {
            throw ValidationException::withMessages(['occupant_count' => 'Số người ở không được vượt quá sức chứa của phòng.']);
        }
    }

    private function validateOccupantCapacity(Contract $contract, Room $room): void
    {
        if (1 + $contract->occupants()->count() > $room->max_occupants) {
            throw ValidationException::withMessages(['room_id' => 'Danh sách người ở cùng và người đại diện vượt sức chứa phòng.']);
        }
    }

    private function query(bool $details = false): Builder
    {
        $query = Contract::query()->with([
            'room:id,building_id,code,status,max_occupants',
            'room.building:id,name',
            'tenant:id,full_name,phone,email,role,status',
        ]);
        if ($details) {
            $query->with(['occupants', 'contractServices' => fn ($lines) => $lines->orderBy('id'), 'contractServices.service:id,code,name,unit,billing_type,status']);
        }

        return $query;
    }

    private function databaseFailure(string $operation): never
    {
        // SQL/bindings có thể chứa ghi chú hoặc định danh; không report exception gốc.
        report(new RuntimeException('Thao tác hợp đồng thất bại do lỗi CSDL.'));
        abort(500, 'Không thể '.$operation.' hợp đồng lúc này. Vui lòng thử lại sau.');
    }
}
