<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Thông tin liên hệ công khai (tên hệ thống, hotline, email). Nhận mảng từ SettingService::publicContact().
 *
 * @property-read array{system_name: ?string, contact_phone: ?string, contact_email: ?string} $resource
 */
class PublicSettingsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'system_name' => $this->resource['system_name'],
            'contact_phone' => $this->resource['contact_phone'],
            'contact_email' => $this->resource['contact_email'],
        ];
    }
}
