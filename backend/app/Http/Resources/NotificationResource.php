<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = $this->data ?? [];
        $link = $data['link'] ?? null;

        return ['id' => $this->id, 'type' => $this->type,
            'title' => $data['title'] ?? 'Thông báo', 'body' => $data['body'] ?? '',
            'link' => is_string($link) && preg_match('~^/(admin|resident|staff)(/[a-zA-Z0-9-]+)*$~D', $link) ? $link : null,
            'read_at' => $this->read_at?->toISOString(), 'created_at' => $this->created_at?->toISOString()];
    }
}
