<?php

use Illuminate\Support\Facades\Route;

// Backend chỉ phục vụ REST API; giao diện do ứng dụng React trong thư mục frontend/ đảm nhiệm.
Route::get('/', fn () => response()->json([
    'name' => config('app.name'),
    'api' => url('/api/v1'),
]));
