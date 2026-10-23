<?php

namespace App\Services;

use App\Enums\ServiceBillingType;
use App\Enums\ServiceStatus;
use App\Models\Service;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ServiceCatalogService
{
    public function paginate(): LengthAwarePaginator
    {
        return Service::query()->orderBy('id')->paginate(20);
    }

    public function create(array $data): Service
    {
        try {
            $service = new Service(Arr::only($data, ['name', 'unit', 'price', 'description']));
            $service->code = $data['code'];
            $service->billing_type = ServiceBillingType::from($data['billing_type']);
            $service->status = ServiceStatus::Active;
            $service->save();

            return $service->refresh();
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Mã hoặc tên dịch vụ vừa được sử dụng. Vui lòng kiểm tra lại.');
        }
    }

    public function update(Service $service, array $data): Service
    {
        try {
            return DB::transaction(function () use ($service, $data): Service {
                $service = Service::query()->lockForUpdate()->findOrFail($service->id);
                if ($service->isMetered() && array_key_exists('price', $data)) {
                    throw ValidationException::withMessages(['price' => 'Giá điện nước chỉ được thay đổi qua bảng giá theo kỳ.']);
                }
                $service->fill(Arr::only($data, ['name', 'price', 'description']));
                $service->save();

                return $service->refresh();
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Tên dịch vụ vừa được sử dụng. Vui lòng kiểm tra lại.');
        }
    }
}
