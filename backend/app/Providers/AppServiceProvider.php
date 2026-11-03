<?php

namespace App\Providers;

use App\Models\Contract;
use App\Models\Invoice;
use App\Models\MaintenanceRequest;
use App\Models\MeterReadingSubmission;
use App\Models\Payment;
use App\Models\Room;
use App\Models\User;
use App\Models\ViewingAppointment;
use App\Services\NotificationService;
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
        foreach ([Contract::class, Invoice::class, Payment::class, MeterReadingSubmission::class, ViewingAppointment::class, MaintenanceRequest::class] as $source) {
            $source::saved(fn ($model) => app(NotificationService::class)->saved($model));
        }
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
        RateLimiter::for('profile-name', fn (Request $request) => Limit::perMinute(30)->by('profile-name:'.$request->user()->id)->response($tooMany));
        RateLimiter::for('profile-password', fn (Request $request) => [
            Limit::perMinute(5)->by('profile-password:'.$request->user()->id)->response($tooMany),
            Limit::perMinute(30)->by('profile-password-ip:'.$request->server('REMOTE_ADDR', 'unknown'))->response($tooMany),
        ]);
        RateLimiter::for('viewing-booking', fn (Request $request) => Limit::perHour(5)->by('viewing-ip:'.$request->server('REMOTE_ADDR', 'unknown'))->response($tooMany));

        // Cột *_type của quan hệ đa hình (attachments, notifications) lưu alias cố định thay vì tên class.
        // Alias đa hình ổn định cho các tài nguyên có tệp/notification.
        Relation::enforceMorphMap([
            'user' => User::class,
            'room' => Room::class,
            'meter_reading_submission' => MeterReadingSubmission::class,
            'payment' => Payment::class,
            'maintenance_request' => MaintenanceRequest::class,
            'contract' => Contract::class,
        ]);
    }
}
