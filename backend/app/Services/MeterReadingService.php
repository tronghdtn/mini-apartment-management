<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\InvoiceStatus;
use App\Enums\MeterReadingKind;
use App\Enums\ServiceStatus;
use App\Models\Contract;
use App\Models\ContractService;
use App\Models\Invoice;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Models\UtilityPrice;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class MeterReadingService
{
    private const RELATIONS = ['room.building:id,name', 'service:id,code,name,unit'];

    public function ensureReady(): void
    {
        if (! Schema::hasTable('meter_readings') || ! Schema::hasColumn('utility_prices', 'building_id')
            || ! Schema::hasColumns('meter_readings', ['periodic_contract_id', 'periodic_vacant_room_id', 'final_contract_id'])) {
            abort(503, 'Cấu trúc chỉ số và giá điện nước theo tòa chưa sẵn sàng trên môi trường này.');
        }
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        $this->ensureReady();
        $query = MeterReading::with(self::RELATIONS);
        foreach (['room_id', 'service_id', 'period', 'kind'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (isset($filters['building_id'])) {
            $query->whereHas('room', fn ($room) => $room->where('building_id', $filters['building_id']));
        }

        return $query->orderByDesc('reading_date')->orderByDesc('id')->paginate(20)->withQueryString();
    }

    public function context(int $roomId, array $data): array
    {
        $entry = ['room_id' => $roomId, ...$data];

        return $this->withLockedContext([$entry], fn ($state) => $this->plan($entry, $state, 'period'));
    }

    public function storeBatch(array $entries): Collection
    {
        try {
            return $this->withLockedContext($entries, function ($state) use ($entries): Collection {
                $saved = new Collection;
                foreach ($entries as $index => $entry) {
                    $prefix = "readings.$index.";
                    $plan = $this->plan($entry, $state, $prefix.'period');
                    if (bccomp($entry['current_reading'], $plan['previous_reading'], 2) < 0) {
                        $this->invalid($prefix.'current_reading', 'Chỉ số mới không được thấp hơn mốc trước '.$plan['previous_reading'].'.');
                    }
                    $consumption = bcsub($entry['current_reading'], $plan['previous_reading'], 2);
                    if (bccomp(bcmul($consumption, (string) $plan['unit_price'], 2), '9007199254740991', 2) > 0) {
                        $this->invalid($prefix.'current_reading', 'Số tiền chỉ số vượt phạm vi biểu diễn chính xác được hỗ trợ.');
                    }
                    $reading = new MeterReading($entry);
                    $reading->kind = MeterReadingKind::Periodic;
                    $reading->contract_id = $plan['contract_id'];
                    $reading->previous_reading = $plan['previous_reading'];
                    $reading->consumption = $consumption;
                    $reading->unit_price = $plan['unit_price'];
                    $reading->amount = Money::meterAmount($consumption, $plan['unit_price']);
                    $reading->save();
                    $saved->push($reading);
                }

                return $saved->load(self::RELATIONS);
            });
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Chỉ số kỳ này vừa được ghi. Vui lòng tải lại dữ liệu.');
        }
    }

    /** Parent locks stabilize ownership, then service locks serialize with U1 price changes. */
    public function withLockedContext(array $entries, callable $action): mixed
    {
        $this->ensureReady();
        $keys = [];
        foreach ($entries as $index => $entry) {
            $key = $entry['room_id'].':'.$entry['service_id'];
            if (isset($keys[$key])) {
                $this->invalid("readings.$index.room_id", 'Mỗi phòng/dịch vụ chỉ nhập một dòng trong một lượt.');
            }
            $keys[$key] = true;
        }

        return DB::transaction(function () use ($entries, $action) {
            $roomIds = array_unique(array_column($entries, 'room_id'));
            $serviceIds = array_unique(array_column($entries, 'service_id'));
            $rooms = Room::whereIn('id', $roomIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            if ($rooms->count() !== count($roomIds)) {
                $this->invalid('readings', 'Có phòng không tồn tại. Vui lòng tải lại danh sách.');
            }
            $query = Contract::withTrashed()->whereIn('room_id', $roomIds)->whereIn('status', [ContractStatus::Active, ContractStatus::Terminated]);
            User::whereIn('id', (clone $query)->pluck('user_id'))->orderBy('id')->lockForUpdate()->get();
            $contracts = $query->orderBy('id')->lockForUpdate()->get();
            $subscriptions = ContractService::whereIn('contract_id', $contracts->modelKeys())->orderBy('id')->lockForUpdate()->get();
            $services = Service::whereIn('id', $serviceIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            if ($services->count() !== count($serviceIds) || $services->contains(fn ($service) => ! $service->isMetered()
                || ! in_array($service->code, [Service::CODE_ELECTRICITY, Service::CODE_WATER], true) || $service->status !== ServiceStatus::Active)) {
                $this->invalid('readings', 'Chỉ ghi chỉ số cho dịch vụ Điện/Nước hệ thống đang hoạt động.');
            }
            $readings = MeterReading::whereIn('room_id', $roomIds)->whereIn('service_id', $serviceIds)->orderBy('id')->lockForUpdate()->get();
            $invoices = Invoice::whereIn('contract_id', $contracts->modelKeys())->orderBy('id')->lockForUpdate()->get();

            return $action(compact('rooms', 'contracts', 'subscriptions', 'services', 'readings', 'invoices'));
        }, 3);
    }

    private function plan(array $entry, array $state, string $errorField): array
    {
        $date = $entry['reading_date'];
        $period = $entry['period'];
        if ($date < $period) {
            $this->invalid($errorField, 'Ngày đo không được trước kỳ tiêu thụ.');
        }
        $room = $state['rooms'][$entry['room_id']];
        $service = $state['services'][$entry['service_id']];
        $contracts = $state['contracts']->where('room_id', $room->id);
        if ($contracts->contains(fn ($contract) => $contract->actual_end_date?->format('Y-m-d') === $date)) {
            $this->invalid($errorField, 'Không ghi periodic vào ngày bàn giao. Hãy thực hiện quy trình chốt chỉ số thanh lý.');
        }
        $history = $state['readings']->where('room_id', $room->id)->where('service_id', $service->id);
        if ($history->contains(fn ($reading) => $reading->kind === MeterReadingKind::Periodic
            && $reading->period->format('Y-m-d') === $period && $reading->reading_date->format('Y-m-d') === $date)) {
            abort(409, 'Đã có chỉ số định kỳ cùng kỳ/ngày đo. Vui lòng tải lại dữ liệu.');
        }
        $latest = $history->sortByDesc(fn ($reading) => $reading->reading_date->format('Y-m-d').':'.str_pad((string) $reading->id, 20, '0', STR_PAD_LEFT))->first();
        if ($latest && $date <= $latest->reading_date->format('Y-m-d')) {
            $this->invalid($errorField, 'Ngày đo phải sau mốc thực tế gần nhất; không ghi ngược hoặc trùng ngày.');
        }
        $owners = $contracts->filter(fn ($contract) => $contract->activated_at !== null && $contract->start_date->format('Y-m-d') <= $date
            && ($contract->actual_end_date === null || $contract->actual_end_date->format('Y-m-d') > $date));
        if ($owners->count() > 1) {
            $this->invalid($errorField, 'Khoảng tiêu thụ có nhiều hợp đồng; không thể tự xác định người chịu phí.');
        }
        $owner = $owners->first();
        if ($owner) {
            $initialField = $service->code === Service::CODE_ELECTRICITY ? 'initial_electricity_reading' : 'initial_water_reading';
            $baselineDate = $owner->start_date->format('Y-m-d');
            $previous = $owner->{$initialField};
            if ($previous === null) {
                $this->invalid($errorField, 'Hợp đồng chưa có chỉ số đầu đã xác nhận. Không tự lấy mốc 0.');
            }
            $prior = $contracts->filter(fn ($contract) => $contract->id !== $owner->id && $contract->actual_end_date !== null
                && $contract->actual_end_date->format('Y-m-d') <= $owner->start_date->format('Y-m-d'))
                ->sortByDesc(fn ($contract) => $contract->actual_end_date->format('Y-m-d').':'.str_pad((string) $contract->id, 20, '0', STR_PAD_LEFT))->first();
            if ($prior && ! $history->contains(fn ($reading) => $reading->contract_id === $prior->id && $reading->kind === MeterReadingKind::Final
                && $reading->reading_date->format('Y-m-d') === $prior->actual_end_date->format('Y-m-d'))) {
                $this->invalid($errorField, 'Hợp đồng trước thiếu mốc chốt của dịch vụ; cần đối chiếu bàn giao.');
            }
            if ($latest && $latest->contract_id !== $owner->id) {
                $comparison = bccomp($previous, $latest->current_reading, 2);
                if ($comparison < 0 || ($comparison > 0 && ($owner->meter_gap_confirmed_by === null || trim($owner->meter_gap_reason ?? '') === ''))) {
                    $this->invalid($errorField, 'Chỉ số đầu thấp hơn mốc trước hoặc chênh lệch chưa được xác nhận.');
                }
            }
            if ($latest && $latest->contract_id === $owner->id) {
                if ($latest->kind === MeterReadingKind::Final) {
                    abort(409, 'Hợp đồng đã có chỉ số chốt. Không ghi tiếp periodic.');
                }
                $previous = $latest->current_reading;
                $baselineDate = $latest->reading_date->format('Y-m-d');
            } elseif ($latest && ($latest->reading_date->format('Y-m-d') > $baselineDate
                || ($latest->reading_date->format('Y-m-d') === $baselineDate && $latest->created_at->gt($owner->activated_at)))) {
                $this->invalid($errorField, 'Mốc chỉ số cắt qua hợp đồng khác/phòng trống; cần đối chiếu mốc bàn giao.');
            }
            $ownReadings = $history->where('contract_id', $owner->id);
            if ($ownReadings->contains(fn ($reading) => $reading->kind === MeterReadingKind::Periodic && $reading->period->format('Y-m-d') === $period)) {
                abort(409, 'Hợp đồng đã có chỉ số định kỳ cho dịch vụ/kỳ này.');
            }
            $lastPeriod = $ownReadings->max(fn ($reading) => $reading->period->format('Y-m-d'));
            $requiredPeriod = $lastPeriod ? CarbonImmutable::parse($lastPeriod)->addMonth()->format('Y-m-d') : CarbonImmutable::parse($owner->start_date)->startOfMonth()->format('Y-m-d');
            if ($period !== $requiredPeriod) {
                $this->invalid($errorField, 'Cần ghi kỳ '.$requiredPeriod.' trước; không bỏ kỳ hoặc tạo chỉ số giả.');
            }
            $lines = $state['subscriptions']->where('contract_id', $owner->id)->where('service_id', $service->id)
                ->filter(fn ($line) => $line->start_date->format('Y-m-d') <= $baselineDate && ($line->end_date === null || $line->end_date->format('Y-m-d') >= $date));
            if ($lines->count() !== 1) {
                $this->invalid($errorField, 'Hợp đồng chưa có đăng ký Điện/Nước hợp lệ cho toàn khoảng tiêu thụ.');
            }
            if ($state['invoices']->where('contract_id', $owner->id)->contains(fn ($invoice) => $invoice->type->value === 'monthly'
                && $invoice->period->format('Y-m-d') === CarbonImmutable::parse($period)->addMonth()->format('Y-m-d')
                && in_array($invoice->status, [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid, InvoiceStatus::Paid], true))) {
                abort(409, 'Kỳ này đã có hóa đơn tháng phát hành. Cần quy trình điều chỉnh trước khi ghi thêm chỉ số.');
            }
        } else {
            if (! $latest) {
                $this->invalid($errorField, 'Phòng trống chưa có mốc thực tế. Không tự suy mốc đầu bằng 0.');
            }
            $previous = $latest->current_reading;
            $baselineDate = $latest->reading_date->format('Y-m-d');
            if ($latest->contract_id !== null && ($latest->kind !== MeterReadingKind::Final
                || ! $contracts->contains(fn ($contract) => $contract->id === $latest->contract_id && $contract->status === ContractStatus::Terminated
                    && $contract->actual_end_date?->format('Y-m-d') === $baselineDate))) {
                $this->invalid($errorField, 'Khoảng tiêu thụ gồm người thuê và phòng trống nhưng chưa có mốc chốt.');
            }
            if ($history->contains(fn ($reading) => $reading->kind === MeterReadingKind::Periodic && $reading->contract_id === null && $reading->period->format('Y-m-d') === $period)) {
                abort(409, 'Phòng trống đã có chỉ số định kỳ cho dịch vụ/kỳ này.');
            }
            $requiredPeriod = $latest->kind === MeterReadingKind::Final ? $latest->period->format('Y-m-d')
                : CarbonImmutable::parse($latest->period)->addMonth()->format('Y-m-d');
            if ($period !== $requiredPeriod) {
                $this->invalid($errorField, 'Phòng trống cần mốc thực tế của kỳ '.$requiredPeriod.'; không gộp nhiều kỳ vào một đơn giá.');
            }
        }
        if ($contracts->contains(fn ($contract) => $contract->id !== $owner?->id && $contract->activated_at !== null
            && $contract->start_date->format('Y-m-d') < $date && ($contract->actual_end_date === null || $contract->actual_end_date->format('Y-m-d') > $baselineDate))) {
            $this->invalid($errorField, 'Khoảng tiêu thụ cắt qua nhiều hợp đồng; cần mốc thực tế ngăn cách.');
        }
        $price = UtilityPrice::where('building_id', $room->building_id)->where('service_id', $service->id)
            ->where('effective_from', '<=', $period)->orderByDesc('effective_from')->orderByDesc('id')->lockForUpdate()->first();
        if (! $price || $price->unit_price < 1) {
            $this->invalid($errorField, 'Tòa nhà chưa cấu hình giá '.$service->name.' có hiệu lực trong kỳ này.');
        }

        return ['room_id' => $room->id, 'service_id' => $service->id, 'contract_id' => $owner?->id,
            'period' => $period, 'reading_date' => $date, 'previous_reading' => $previous,
            'baseline_date' => $baselineDate, 'unit_price' => $price->unit_price];
    }

    private function invalid(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
