<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** DB-D51 — Email tùy chọn; giữ nguyên dữ liệu và UNIQUE hiện có. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email', 191)->nullable()->change();
        });
    }

    public function down(): void
    {
        if (DB::table('users')->whereNull('email')->exists()) {
            throw new RuntimeException(
                'Không thể rollback: còn tài khoản có email NULL. Cần bổ sung email hợp lệ do người dùng cung cấp trước khi chuyển về NOT NULL; không tự xóa tài khoản hoặc điền email giả.',
            );
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('email', 191)->nullable(false)->change();
        });
    }
};
