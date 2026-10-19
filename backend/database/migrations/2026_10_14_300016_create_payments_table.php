<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M16 — docs/09_DATABASE_DESIGN.md §3.16.
 * status KHÔNG có default theo thiết kế: Service gán tường minh (pending khi cư dân gửi; confirmed khi Admin nhập
 * hoặc khấu trừ cọc). receipt_number sinh khi xác nhận (DB-D13). Không xóa lịch sử thanh toán (RESTRICT).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('amount');
            $table->string('method', 20);
            $table->string('status', 20);
            $table->string('receipt_number', 30)->nullable()->unique();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('reject_reason')->nullable();
            $table->timestamps();

            $table->index(['invoice_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index(['reviewed_by', 'reviewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
