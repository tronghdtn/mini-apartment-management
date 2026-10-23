<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSpaSession
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->hasSession() && $request->attributes->get('sanctum') === true, 419, 'Phiên không hợp lệ. Vui lòng tải lại trang và thử lại.');

        return $next($request);
    }
}
