<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AccountEmail\AccountEmailRequest;
use App\Services\AccountEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class AccountEmailController extends Controller
{
    public function __construct(private readonly AccountEmailService $emails) {}

    public function forgotPassword(AccountEmailRequest $request): JsonResponse
    {
        $this->emails->requestPasswordReset($request->validated('email'));

        return response()->json(['message' => 'Nếu email đã được xác minh trong hệ thống, liên kết đặt lại mật khẩu sẽ được gửi tới email đó. '
            .'Tài khoản chưa có email đã xác minh vui lòng liên hệ ban quản lý.'], 202);
    }

    public function resetPassword(AccountEmailRequest $request): Response
    {
        $this->emails->resetPassword($request->safe()->only(['email', 'token', 'password', 'password_confirmation']));

        return response()->noContent();
    }

    public function sendVerification(AccountEmailRequest $request): JsonResponse
    {
        $request->validated();
        $this->emails->sendVerification($request->user());

        return response()->json(['message' => 'Đã gửi liên kết xác minh tới email của bạn.'], 202);
    }

    public function verify(AccountEmailRequest $request): JsonResponse
    {
        $this->emails->verify($request->validated());

        return response()->json(['message' => 'Email đã được xác minh.']);
    }

    public function requestChange(AccountEmailRequest $request): JsonResponse
    {
        $this->emails->requestChange($request->user(), $request->validated());

        return response()->json(['message' => 'Đã gửi liên kết xác nhận tới email mới. Email hiện tại giữ nguyên cho tới khi bạn xác nhận.'], 202);
    }

    public function confirmChange(AccountEmailRequest $request): JsonResponse
    {
        // Liên kết công khai: không trả hồ sơ tài khoản, chỉ báo kết quả.
        $this->emails->confirmChange($request->validated('token'));

        return response()->json(['message' => 'Đã đổi email đăng nhập. Hãy dùng email mới cho các lần sau.']);
    }
}
