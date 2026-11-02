<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** DB-D85: prepare/test only; applying this to dev requires separate approval. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table): void {
            $table->timestamp('deposit_refunded_at')->nullable();
            $table->foreignId('deposit_refunded_by')->nullable()->constrained('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        // Do not silently erase evidence of money already returned outside the system.
        if (DB::table('contracts')->whereNotNull('deposit_refunded_at')->orWhereNotNull('deposit_refunded_by')->exists()) {
            throw new RuntimeException('Không thể rollback: đã có xác nhận hoàn cọc. Cần đánh giá cách bảo toàn lịch sử trước.');
        }

        Schema::table('contracts', function (Blueprint $table): void {
            $table->dropForeign(['deposit_refunded_by']);
            $table->dropColumn(['deposit_refunded_at', 'deposit_refunded_by']);
        });
    }
};
