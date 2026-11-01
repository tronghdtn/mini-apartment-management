<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notification\NotificationRequest;
use App\Http\Resources\NotificationResource;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(NotificationRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $query = $this->notifications->query($request->user());
        $unread = (clone $query)->whereNull('read_at')->count();
        if (($filters['status'] ?? 'all') === 'unread') {
            $query->whereNull('read_at');
        }
        $response = NotificationResource::collection($query->orderByDesc('created_at')->orderByDesc('id')->paginate(20)->withQueryString())->response()->getData(true);
        $response['unread_count'] = $unread;

        return response()->json($response);
    }

    public function read(NotificationRequest $request, string $notification): NotificationResource
    {
        $query = $this->notifications->query($request->user());
        $item = (clone $query)->whereKey($notification)->firstOrFail();
        Gate::authorize('view', $item);
        $query->whereKey($notification)->whereNull('read_at')->update(['read_at' => now(), 'updated_at' => now()]);

        return new NotificationResource($item->fresh());
    }

    public function readAll(NotificationRequest $request): JsonResponse
    {
        return response()->json(['data' => ['marked_count' => $this->notifications->readAll($request->user())]]);
    }
}
