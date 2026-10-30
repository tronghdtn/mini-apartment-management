<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\MeterReadingKind;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\ContractService as ContractServiceModel;
use App\Models\MeterReading;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use App\Models\UtilityPrice;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/** Read-only final meter calculation. Persisting a final reading is reserved for the atomic close operation. */
class FinalMeterReadingPreviewService
{
    private const METERED_CODES = [Service::CODE_ELECTRICITY, Service::CODE_WATER];

    public function ensureReady(): void
    {
        $tablesReady = collect(['contracts', 'contract_services', 'rooms', 'users', 'services', 'utility_prices', 'meter_readings'])
            ->every(fn (string $table) => Schema::hasTable($table));
        abort_unless($tablesReady
            && Schema::hasColumn('utility_prices', 'building_id')
            && Schema::hasColumns('meter_readings', ['periodic_vacant_room_id', 'periodic_contract_id', 'final_contract_id'])
            && Schema::hasColumns('contracts', ['early_termination_fee_type', 'early_termination_fee_amount', 'early_termination_fee_multiplier',
                'early_termination_waiver_conditions', 'early_termination_waiver_code', 'early_termination_waived_by',
                'early_termination_waived_at', 'early_termination_waiver_note']),
            503, 'Cấu trúc chỉ số chốt theo tòa/hợp đồng chưa sẵn sàng trên môi trường này.');
    }

    public function preview(Contract $original, User $actor, array $data): array
    {
        $this->ensureReady();

        return DB::transaction(function () use ($original, $actor, $data): array {
            $room = Room::whereKey($original->room_id)->lockForUpdate()->firstOrFail();

            // Match the MTR lock order: room, users, contracts, subscriptions/services, readings, prices.
            $tenantIds = Contract::withTrashed()->where('room_id', $original->room_id)->pluck('user_id')->all();
            $userIds = array_values(array_unique([...$tenantIds, $actor->id]));
            $users = User::whereIn('id', $userIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $contracts = Contract::withTrashed()->where('room_id', $original->room_id)->orderBy('id')->lockForUpdate()->get();
            $contract = $contracts->firstWhere('id', $original->id) ?? abort(404);
            $admin = $users->get($actor->id);
            abort_unless($admin !== null && $admin->isActive() && $admin->hasRole(UserRole::Admin), 403);
            abort_unless($contract->room_id === $original->room_id && $contract->user_id === $original->user_id, 409,
                'Hợp đồng vừa thay đổi. Vui lòng tải lại.');

            $subscriptions = ContractServiceModel::where('contract_id', $contract->id)->orderBy('id')->lockForUpdate()->get();
            $contract->setRelation('contractServices', $subscriptions);
            $closure = app(ContractClosureService::class)->assess($contract, $data);
            $services = Service::whereIn('code', self::METERED_CODES)->orderBy('id')->lockForUpdate()->get()->keyBy('code');
            if (count($services) !== count(self::METERED_CODES) || $services->contains(fn ($service) => ! $service->isMetered() || $service->status !== ServiceStatus::Active || $service->price !== null)) {
                abort(503, 'Danh mục hệ thống Điện/Nước chưa sẵn sàng để chốt chỉ số.');
            }

            $readings = MeterReading::where('room_id', $contract->room_id)->whereIn('service_id', $services->pluck('id'))
                ->orderBy('reading_date')->orderBy('id')->lockForUpdate()->get();
            $period = CarbonImmutable::parse($data['actual_end_date'], config('app.business_timezone'))->startOfMonth()->format('Y-m-d');
            $prices = UtilityPrice::where('building_id', $room->building_id)
                ->whereIn('service_id', $services->pluck('id'))->where('effective_from', '<=', $period)
                ->orderBy('service_id')->orderBy('effective_from')->orderBy('id')->lockForUpdate()->get();

            $calculated = [];
            foreach (self::METERED_CODES as $code) {
                $service = $services->get($code);
                $lines = $subscriptions->where('service_id', $service->id);
                if ($lines->count() !== 1) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Hợp đồng thiếu đăng ký dịch vụ '.$service->name.'.');
                }
                $line = $lines->first();
                if ($line->start_date->format('Y-m-d') > $data['actual_end_date']
                    || ($line->end_date !== null && $line->end_date->format('Y-m-d') < $data['actual_end_date'])) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Đăng ký dịch vụ '.$service->name.' không bao phủ đến ngày bàn giao.');
                }

                $history = $readings->where('service_id', $service->id);
                if ($history->contains(fn (MeterReading $reading) => $reading->reading_date->format('Y-m-d') > $data['actual_end_date'])) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Đã có mốc chỉ số sau ngày bàn giao; không thể ghi ngược lịch sử.');
                }
                if ($history->contains(fn (MeterReading $reading) => $reading->contract_id === $contract->id
                    && $reading->kind === MeterReadingKind::Final)) {
                    abort(409, 'Hợp đồng đã có chỉ số chốt cho dịch vụ '.$service->name.'.');
                }

                $own = $history->where('contract_id', $contract->id)->where('kind', MeterReadingKind::Periodic);
                $finalPeriod = CarbonImmutable::parse($period);
                $periodStart = CarbonImmutable::parse($contract->start_date->format('Y-m-d'))->startOfMonth();
                while ($periodStart->lessThan($finalPeriod)) {
                    $matching = $own->filter(fn (MeterReading $reading) => $reading->period->format('Y-m-d') === $periodStart->format('Y-m-d'));
                    if ($matching->count() !== 1) {
                        $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                            'Thiếu đúng một chỉ số định kỳ '.$service->name.' kỳ '.$periodStart->format('m/Y').'.');
                    }
                    $periodStart = $periodStart->addMonthNoOverflow();
                }
                if ($own->contains(fn (MeterReading $reading) => $reading->period->format('Y-m-d') > $period)) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Đã có kỳ chỉ số nằm sau tháng bàn giao.');
                }

                $latest = $history->sortByDesc(fn (MeterReading $reading) => $reading->reading_date->format('Y-m-d').':'
                    .str_pad((string) $reading->id, 20, '0', STR_PAD_LEFT))->first();
                $field = $code === Service::CODE_ELECTRICITY ? 'initial_electricity_reading' : 'initial_water_reading';
                $initial = $contract->{$field};
                if ($initial === null) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Hợp đồng thiếu chỉ số đầu đã xác nhận. Không tự lấy mốc 0.');
                }
                $baseline = (string) $initial;
                $baselineDate = $contract->start_date->format('Y-m-d');
                $orderedOwn = $own->sortBy(fn (MeterReading $reading) => $reading->reading_date->format('Y-m-d').':'
                    .str_pad((string) $reading->id, 20, '0', STR_PAD_LEFT));
                $hasPriorOwn = false;
                foreach ($orderedOwn as $reading) {
                    $readingDate = $reading->reading_date->format('Y-m-d');
                    try {
                        $snapshotValid = bccomp($reading->previous_reading, $baseline, 2) === 0
                            && bccomp($reading->current_reading, $reading->previous_reading, 2) >= 0
                            && bccomp(bcsub($reading->current_reading, $reading->previous_reading, 2), $reading->consumption, 2) === 0
                            && $reading->unit_price >= 1 && $reading->unit_price <= Money::MAX_VND
                            && Money::meterAmount($reading->consumption, $reading->unit_price) === $reading->amount;
                    } catch (InvalidArgumentException) {
                        $snapshotValid = false;
                    }
                    if (! $snapshotValid || $readingDate < $contract->start_date->format('Y-m-d')
                        || ($hasPriorOwn && $readingDate <= $baselineDate)
                        || (! $hasPriorOwn && $latest && $latest->contract_id !== $contract->id
                            && $readingDate <= $latest->reading_date->format('Y-m-d'))) {
                        $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                            'Chuỗi chỉ số đã lưu không liên tục hoặc snapshot không nhất quán; cần đối chiếu.');
                    }
                    $baseline = $reading->current_reading;
                    $baselineDate = $readingDate;
                    $hasPriorOwn = true;
                }
                $previous = $orderedOwn->last()?->current_reading;
                if ($previous === null) {
                    $previous = $initial;
                }
                if ($latest && $latest->contract_id !== $contract->id) {
                    if ($latest->reading_date->format('Y-m-d') > $contract->start_date->format('Y-m-d')
                        || ($latest->reading_date->format('Y-m-d') === $contract->start_date->format('Y-m-d')
                            && $latest->created_at->gt($contract->activated_at))) {
                        $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                            'Mốc gần nhất cắt vào thời gian thuê; cần đối chiếu trước khi chốt.');
                    }
                    if ($latest->contract_id !== null) {
                        $prior = $contracts->firstWhere('id', $latest->contract_id);
                        if (! $prior || $prior->status !== ContractStatus::Terminated
                            || $prior->actual_end_date?->format('Y-m-d') !== $latest->reading_date->format('Y-m-d')
                            || $latest->kind !== MeterReadingKind::Final) {
                            $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                                'Mốc của hợp đồng trước chưa được chốt hợp lệ.');
                        }
                    }
                    $comparison = bccomp((string) $initial, $latest->current_reading, 2);
                    if ($comparison < 0 || ($comparison > 0 && ($contract->meter_gap_confirmed_by === null
                        || trim($contract->meter_gap_reason ?? '') === ''))) {
                        $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                            'Chỉ số đầu thấp hơn mốc gần nhất hoặc chênh lệch chưa được xác nhận.');
                    }
                }
                if ($latest && $latest->contract_id === $contract->id && $latest->reading_date->format('Y-m-d') >= $data['actual_end_date']) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Ngày bàn giao phải sau lần ghi periodic gần nhất để xác định chuỗi tiêu thụ.');
                }

                $rawCurrent = $data[$code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading'];
                if (bccomp($rawCurrent, (string) $previous, 2) < 0) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Chỉ số cuối không được thấp hơn mốc thực tế '.$previous.'.');
                }
                $price = $prices->where('service_id', $service->id)->filter(fn (UtilityPrice $candidate) => $candidate->effective_from->format('Y-m-d') <= $period)->sortByDesc(fn (UtilityPrice $candidate) => $candidate->effective_from->format('Y-m-d').':'.str_pad((string) $candidate->id, 20, '0', STR_PAD_LEFT))->first();
                if (! $price || $price->unit_price < 1 || $price->unit_price > Money::MAX_VND) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Tòa nhà chưa có giá '.$service->name.' có hiệu lực trong kỳ bàn giao.');
                }
                $consumption = bcsub($rawCurrent, (string) $previous, 2);
                if (bccomp(bcmul($consumption, (string) $price->unit_price, 2), (string) Money::MAX_VND, 2) > 0) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Tiền chỉ số vượt phạm vi xử lý an toàn.');
                }
                try {
                    $amount = Money::meterAmount($consumption, $price->unit_price);
                } catch (InvalidArgumentException) {
                    $this->invalid($code === Service::CODE_ELECTRICITY ? 'electricity_reading' : 'water_reading',
                        'Tiền chỉ số vượt phạm vi xử lý an toàn.');
                }
                $calculated[] = ['service_code' => $service->code, 'service_name' => $service->name, 'unit' => $service->unit,
                    'period' => $period, 'reading_date' => $data['actual_end_date'], 'previous_reading' => (string) $previous,
                    'current_reading' => $rawCurrent, 'consumption' => $consumption, 'unit_price' => $price->unit_price, 'amount' => $amount];
            }

            try {
                $meterAmount = Money::sum(array_column($calculated, 'amount'));
            } catch (InvalidArgumentException) {
                $this->invalid('electricity_reading', 'Tổng tiền điện nước vượt phạm vi xử lý an toàn.');
            }

            return [...$closure, 'period' => $period, 'readings' => $calculated, 'meter_amount' => $meterAmount, 'is_preview' => true];
        }, 3);
    }

    private function invalid(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
