<?php

namespace Database\Seeders;

use App\Enums\ServiceBillingType;
use App\Enums\ServiceStatus;
use App\Models\Service;
use App\Models\Setting;
use App\Services\SettingService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SystemCatalogSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            foreach ([Service::CODE_ELECTRICITY => ['name' => 'Điện', 'unit' => 'kWh'], Service::CODE_WATER => ['name' => 'Nước', 'unit' => 'm3']] as $code => $definition) {
                $service = Service::query()->where('code', $code)->lockForUpdate()->first();
                if ($service !== null) {
                    if ($service->code !== $code || ! $service->isMetered() || $service->price !== null || $service->unit !== $definition['unit']) {
                        throw new RuntimeException('Mã dịch vụ hệ thống '.$code.' đang có định nghĩa xung đột. Không thay đổi dữ liệu.');
                    }

                    continue;
                }

                $service = new Service(['name' => $definition['name'], 'unit' => $definition['unit'], 'price' => null]);
                $service->code = $code;
                $service->billing_type = ServiceBillingType::Metered;
                $service->status = ServiceStatus::Active;
                $service->save();
            }

            foreach (SettingService::DEFAULT_SETTINGS as $key => $definition) {
                Setting::query()->firstOrCreate(['key' => $key], $definition);
            }
        }, 3);
    }
}
