<?php

namespace App\Services;

use App\Models\Service;
use App\Models\UtilityPrice;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class UtilityPriceService
{
    public function ensureReady(bool $forWrite = false): void
    {
        if (! Schema::hasTable('utility_prices')) {
            abort(503, 'Bảng giá điện nước chưa được triển khai trên môi trường này. Vui lòng liên hệ quản trị viên.');
        }
        if ($forWrite && ! Schema::hasTable('meter_readings')) {
            abort(503, 'Chưa thể kiểm tra kỳ đã ghi chỉ số để thêm giá. Vui lòng liên hệ quản trị viên.');
        }
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        $this->ensureReady();
        $query = UtilityPrice::query()->with('service:id,code,name,unit');
        if (isset($filters['service_id'])) {
            $query->where('service_id', $filters['service_id']);
        }

        return $query->orderByDesc('effective_from')->orderByDesc('id')->paginate(20)->withQueryString();
    }

    public function create(array $data): UtilityPrice
    {
        $this->ensureReady(forWrite: true);

        try {
            return DB::transaction(function () use ($data): UtilityPrice {
                // MTR phải dùng cùng khóa dịch vụ trước khi chọn/snapshot giá và ghi chỉ số.
                $service = Service::query()->lockForUpdate()->findOrFail($data['service_id']);
                if (! $service->isMetered()) {
                    throw ValidationException::withMessages(['service_id' => 'Chỉ được thêm giá cho dịch vụ tính theo chỉ số.']);
                }
                $latestPeriod = $service->meterReadings()->max('period');
                if ($latestPeriod !== null && $data['effective_from'] <= $latestPeriod) {
                    throw ValidationException::withMessages(['effective_from' => 'Ngày hiệu lực phải sau mọi kỳ đã ghi chỉ số của dịch vụ.']);
                }

                $price = new UtilityPrice([
                    'service_id' => $service->id,
                    'unit_price' => $data['unit_price'],
                    'effective_from' => $data['effective_from'],
                ]);
                $price->save();

                return $price->refresh()->load('service:id,code,name,unit');
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Giá cho kỳ này vừa được tạo. Vui lòng tải lại dữ liệu.');
        }
    }
}
