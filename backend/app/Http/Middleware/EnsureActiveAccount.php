<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user(), 401, 'Bạn chưa đăng nhập.');

        if (! $request->user()->isActive()) {
            Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
            abort(403, 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
        }

        return $next($request);
    }
}
