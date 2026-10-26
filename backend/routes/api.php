<?php

use App\Http\Controllers\Api\V1\AdminUserController;
use App\Http\Controllers\Api\V1\AmenityAssignmentController;
use App\Http\Controllers\Api\V1\AmenityController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BuildingController;
use App\Http\Controllers\Api\V1\ContractController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PublicRoomController;
use App\Http\Controllers\Api\V1\RoomController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\UtilityPriceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Mọi route trong file này tự động có prefix /api/v1 (xem bootstrap/app.php).
| Route cần đăng nhập đặt trong nhóm middleware('auth:sanctum').
*/

Route::get('/health', HealthController::class)->name('api.v1.health');

Route::prefix('public/rooms')->name('api.v1.public.rooms.')->group(function () {
    Route::get('/', [PublicRoomController::class, 'index'])->name('index');
    Route::get('/filters', [PublicRoomController::class, 'filters'])->name('filters');
    Route::get('/{room}', [PublicRoomController::class, 'show'])->whereNumber('room')->name('show');
});

Route::prefix('auth')->name('api.v1.auth.')->group(function () {
    Route::middleware('spa')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register')->name('register');
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login')->name('login');
    });

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('/me', [AuthController::class, 'me'])->name('me');
        Route::post('/logout', [AuthController::class, 'logout'])->middleware('spa')->name('logout');
    });
});

Route::middleware(['auth:sanctum', 'active', 'role:admin'])->name('api.v1.')->group(function () {
    Route::get('contracts', [ContractController::class, 'index'])->name('contracts.index');
    Route::get('contracts/{contract}', [ContractController::class, 'show'])->whereNumber('contract')->name('contracts.show');
    Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
    Route::get('users/{user}', [AdminUserController::class, 'show'])->whereNumber('user')->name('users.show');
    Route::get('buildings/{building}/amenities', [AmenityAssignmentController::class, 'buildingIndex'])->whereNumber('building')->name('buildings.amenities.index');
    Route::get('rooms/{room}/amenities', [AmenityAssignmentController::class, 'roomIndex'])->whereNumber('room')->name('rooms.amenities.index');
    Route::get('services', [ServiceController::class, 'index'])->name('services.index');
    Route::get('services/{service}', [ServiceController::class, 'show'])->name('services.show');
    Route::get('utility-prices', [UtilityPriceController::class, 'index'])->name('utility-prices.index');
    Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
    Route::get('rooms', [RoomController::class, 'index'])->name('rooms.index');
    Route::get('rooms/{room}', [RoomController::class, 'show'])->whereNumber('room')->name('rooms.show');
    Route::get('buildings', [BuildingController::class, 'index'])->name('buildings.index');
    Route::get('buildings/{building}', [BuildingController::class, 'show'])->name('buildings.show');
    Route::get('amenities', [AmenityController::class, 'index'])->name('amenities.index');
    Route::get('amenities/{amenity}', [AmenityController::class, 'show'])->name('amenities.show');
    Route::middleware('spa')->group(function () {
        Route::post('contracts', [ContractController::class, 'store'])->name('contracts.store');
        Route::put('contracts/{contract}/services', [ContractController::class, 'updateServices'])->whereNumber('contract')->name('contracts.services.update');
        Route::patch('contracts/{contract}', [ContractController::class, 'update'])->whereNumber('contract')->name('contracts.update');
        Route::delete('contracts/{contract}', [ContractController::class, 'destroy'])->whereNumber('contract')->name('contracts.destroy');
        Route::post('users', [AdminUserController::class, 'store'])->name('users.store');
        Route::patch('users/{user}/status', [AdminUserController::class, 'updateStatus'])->whereNumber('user')->name('users.status');
        Route::patch('users/{user}', [AdminUserController::class, 'updateName'])->whereNumber('user')->name('users.updateName');
        Route::put('buildings/{building}/amenities', [AmenityAssignmentController::class, 'buildingUpdate'])->whereNumber('building')->name('buildings.amenities.update');
        Route::put('rooms/{room}/amenities', [AmenityAssignmentController::class, 'roomUpdate'])->whereNumber('room')->name('rooms.amenities.update');
        Route::put('settings/{key}', [SettingController::class, 'update'])
            ->whereIn('key', ['invoice.due_days', 'contract.expiring_warning_days'])->name('settings.update');
        Route::post('services', [ServiceController::class, 'store'])->name('services.store');
        Route::match(['patch', 'put'], 'services/{service}', [ServiceController::class, 'update'])->name('services.update');
        Route::post('utility-prices', [UtilityPriceController::class, 'store'])->name('utility-prices.store');
        Route::post('rooms', [RoomController::class, 'store'])->name('rooms.store');
        Route::match(['patch', 'put'], 'rooms/{room}', [RoomController::class, 'update'])->whereNumber('room')->name('rooms.update');
        Route::post('buildings', [BuildingController::class, 'store'])->name('buildings.store');
        Route::match(['patch', 'put'], 'buildings/{building}', [BuildingController::class, 'update'])->name('buildings.update');
        Route::post('amenities', [AmenityController::class, 'store'])->name('amenities.store');
        Route::match(['patch', 'put'], 'amenities/{amenity}', [AmenityController::class, 'update'])->name('amenities.update');
        Route::delete('amenities/{amenity}', [AmenityController::class, 'destroy'])->name('amenities.destroy');
    });
});
