<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\IndexUserRequest;
use App\Http\Requests\User\StoreStaffUserRequest;
use App\Http\Requests\User\UpdateUserNameRequest;
use App\Http\Requests\User\UpdateUserStatusRequest;
use App\Http\Resources\AdminUserDetailResource;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\AdminUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AdminUserController extends Controller
{
    public function __construct(private readonly AdminUserService $users) {}

    public function index(IndexUserRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', User::class);

        return AdminUserResource::collection($this->users->paginate($request->validated()));
    }

    public function show(string $user): AdminUserDetailResource
    {
        Gate::authorize('viewAny', User::class);
        $target = $this->users->find($user);
        Gate::authorize('view', $target);

        return new AdminUserDetailResource($target);
    }

    public function store(StoreStaffUserRequest $request): JsonResponse
    {
        Gate::authorize('createStaff', User::class);

        return (new AdminUserResource($this->users->createStaff($request->validated())))->response()->setStatusCode(201);
    }

    public function updateStatus(UpdateUserStatusRequest $request, string $user): AdminUserResource
    {
        Gate::authorize('changeStatus', $this->users->find($user));

        return new AdminUserResource($this->users->changeStatus($request->user(), $user, UserStatus::from($request->validated('status'))));
    }

    public function updateName(UpdateUserNameRequest $request, string $user): AdminUserResource
    {
        Gate::authorize('updateName', $this->users->find($user));

        return new AdminUserResource($this->users->updateName($request->user(), $user, $request->validated('full_name')));
    }
}
