<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M01 — Đưa bảng users của framework về thiết kế docs/09_DATABASE_DESIGN.md §3.1.
 * ALTER bằng migration mới, không sửa migration framework đã chạy (DB-D21).
 * Giữ email_verified_at (DB-D12). Cột phone NOT NULL UNIQUE: bảng phải rỗng hoặc đã có phone hợp lệ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('name', 'full_name');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('full_name', 120)->change();
            $table->string('email', 191)->change();

            $table->string('phone', 20)->unique()->after('email');
            $table->string('role', 20)->default('user')->after('password');
            $table->string('status', 20)->default('active')->after('role');
            $table->string('id_number', 20)->nullable()->unique()->after('status');
            $table->date('date_of_birth')->nullable()->after('id_number');
            $table->string('gender', 20)->nullable()->after('date_of_birth');
            $table->text('permanent_address')->nullable()->after('gender');

            $table->index(['role', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role', 'status']);
            $table->dropUnique(['phone']);
            $table->dropUnique(['id_number']);
            $table->dropColumn(['phone', 'role', 'status', 'id_number', 'date_of_birth', 'gender', 'permanent_address']);

            $table->string('email', 255)->change();
            $table->string('full_name', 255)->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('full_name', 'name');
        });
    }
};
