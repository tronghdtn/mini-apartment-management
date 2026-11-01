<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomPhotoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $route = $request->routeIs('api.v1.public.rooms.*')
            ? 'api.v1.public.rooms.photos.show' : 'api.v1.rooms.photos.content';

        return ['id' => $this->id, 'url' => route($route, ['room' => $this->attachable_id, 'photo' => $this->id], false),
            'is_cover' => $this->is_cover, 'sort_order' => $this->sort_order];
    }
}
