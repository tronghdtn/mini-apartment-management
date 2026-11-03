<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\AccountProfileService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class AccountProfileController extends Controller
{
    public function __construct(private readonly AccountProfileService $profiles) {}

    public function update(UpdateProfileRequest $request): UserResource
    {
        return new UserResource($this->profiles->updateName($request->user(), $request->validated()));
    }

    public function password(ChangePasswordRequest $request): Response
    {
        $this->profiles->changePassword($request->user(), $request->validated());
        Auth::guard('web')->logoutCurrentDevice(); // Token already rotated in the atomic password update.
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
