<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        abort_unless($request->user(), 401, 'Bạn chưa đăng nhập.');
        $allowed = array_filter(array_map(UserRole::tryFrom(...), $roles));
        abort_unless($request->user()->isActive() && in_array($request->user()->role, $allowed, true), 403, 'Bạn không có quyền thực hiện thao tác này.');

        return $next($request);
    }
}
