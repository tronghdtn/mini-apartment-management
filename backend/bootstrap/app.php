<?php

use App\Http\Middleware\EnsureActiveAccount;
use App\Http\Middleware\EnsureSpaSession;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum SPA: request từ domain trong SANCTUM_STATEFUL_DOMAINS được xác thực bằng session cookie.
        $middleware->statefulApi();
        $middleware->alias([
            'spa' => EnsureSpaSession::class,
            'active' => EnsureActiveAccount::class,
            'role' => EnsureUserHasRole::class,
        ]);

        // Nginx reverse proxy chạy trong mạng Docker nội bộ.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return $request->is('api/*') ? response()->json(['message' => 'Bạn chưa đăng nhập.'], 401) : null;
        });
        $exceptions->render(function (ValidationException $e, Request $request) {
            return $request->is('api/*') ? response()->json(['message' => 'Dữ liệu không hợp lệ.', 'errors' => $e->errors()], 422) : null;
        });
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($request->is('api/*') && in_array($e->getStatusCode(), [401, 403, 404, 409, 419, 429, 500, 503], true)) {
                $message = match ($e->getStatusCode()) {
                    404 => 'Không tìm thấy dữ liệu yêu cầu.',
                    419 => 'Phiên không hợp lệ. Vui lòng tải lại trang và thử lại.',
                    default => $e->getMessage(),
                };

                return response()->json(['message' => $message], $e->getStatusCode(), $e->getHeaders());
            }

            return null;
        });
    })->create();
