<?php

namespace App\Services;

use App\Enums\HealthStatus;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthCheckService
{
    /**
     * Kiểm tra trạng thái ứng dụng và các phụ thuộc bắt buộc (hiện tại: cơ sở dữ liệu).
     *
     * @return array<string, mixed>
     */
    public function check(): array
    {
        $database = $this->checkDatabase();

        return [
            'status' => $database['status'],
            'app' => config('app.name'),
            'environment' => app()->environment(),
            'laravel_version' => app()->version(),
            'php_version' => PHP_VERSION,
            'database' => $database,
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * @return array{status: HealthStatus, driver: string, error: string|null}
     */
    private function checkDatabase(): array
    {
        $driver = (string) config('database.default');

        try {
            DB::connection()->select('select 1');

            return ['status' => HealthStatus::Ok, 'driver' => $driver, 'error' => null];
        } catch (Throwable $e) {
            report($e);

            return [
                'status' => HealthStatus::Degraded,
                'driver' => $driver,
                'error' => config('app.debug') ? $e->getMessage() : 'Database connection failed.',
            ];
        }
    }
}
