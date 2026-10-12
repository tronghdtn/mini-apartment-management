<?php

use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Mọi route trong file này tự động có prefix /api/v1 (xem bootstrap/app.php).
| Route cần đăng nhập đặt trong nhóm middleware('auth:sanctum').
*/

Route::get('/health', HealthController::class)->name('api.v1.health');
