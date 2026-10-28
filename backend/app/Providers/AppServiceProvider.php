<?php

namespace App\Providers;

use App\Models\MeterReadingSubmission;
use App\Models\Payment;
use App\Models\User;
use App\Support\AuthIdentity;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Dự án chỉ dùng SPA cookie; không tra cứu bảng personal_access_tokens.
        Sanctum::getAccessTokenFromRequestUsing(fn () => null);

        $tooMany = fn (Request $request, array $headers) => response()->json(['message' => 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.'], 429, $headers);
        RateLimiter::for('auth-login', function (Request $request) use ($tooMany) {
            $identifier = AuthIdentity::identifier($request->input('identifier'));
            $key = hash('sha256', is_string($identifier) ? $identifier : 'invalid');

            return [
                Limit::perMinute(5)->by('login-identity:'.$key)->response($tooMany),
                // Nginx/FastCGI truyền REMOTE_ADDR; không tin X-Forwarded-For do client tự gửi.
                Limit::perMinute(30)->by('login-ip:'.$request->server('REMOTE_ADDR', 'unknown'))->response($tooMany),
            ];
        });
        RateLimiter::for('auth-register', fn (Request $request) => Limit::perMinute(5)->by('register-ip:'.$request->server('REMOTE_ADDR', 'unknown'))->response($tooMany));

        // Cột *_type của quan hệ đa hình (attachments, notifications) lưu alias cố định thay vì tên class.
        // Bổ sung 'room', 'maintenance_request' khi tạo các Model tương ứng (docs/DATABASE_IMPLEMENTATION_PLAN.md).
        Relation::enforceMorphMap([
            'user' => User::class,
            'meter_reading_submission' => MeterReadingSubmission::class,
            'payment' => Payment::class,
        ]);
    }
}
