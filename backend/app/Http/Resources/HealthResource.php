<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read array<string, mixed> $resource
 */
class HealthResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $debug = (bool) config('app.debug');

        return [
            'status' => $this->resource['status'],
            'app' => $this->resource['app'],
            'environment' => $this->resource['environment'],
            // Chỉ lộ phiên bản khi debug để tránh tiết lộ thông tin môi trường production.
            'laravel_version' => $this->when($debug, $this->resource['laravel_version']),
            'php_version' => $this->when($debug, $this->resource['php_version']),
            'database' => $this->resource['database'],
            'timestamp' => $this->resource['timestamp'],
        ];
    }
}
