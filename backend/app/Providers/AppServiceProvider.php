<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

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
        // Cột *_type của quan hệ đa hình (attachments, notifications) lưu alias cố định thay vì tên class.
        // Bổ sung 'room', 'maintenance_request', 'payment' khi tạo các Model tương ứng (docs/DATABASE_IMPLEMENTATION_PLAN.md).
        Relation::enforceMorphMap([
            'user' => User::class,
        ]);
    }
}
