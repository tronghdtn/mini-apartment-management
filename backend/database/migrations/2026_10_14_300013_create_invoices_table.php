<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M13 — docs/09_DATABASE_DESIGN.md §3.14, §6.2.
 *
 * - Một hóa đơn monthly chưa hủy mỗi hợp đồng + kỳ, một final chưa hủy mỗi hợp đồng: generated column STORED + UNIQUE
 *   với tên chính thức live_* (DB-D14). Biểu thức dùng chuỗi 'monthly', 'final', 'cancelled' của Enum.
 * - invoice_number NULL khi draft, sinh khi phát hành (DB-D13). Hóa đơn đã phát hành bất biến; sửa = hủy + lập lại
 *   với related_invoice_id (DB-D27). Không xóa cứng hóa đơn (FK RESTRICT ở các bảng con).
 * - FK contract_id là RESTRICT: MySQL cấm CASCADE/SET NULL trên cột gốc của generated column.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 30)->nullable()->unique();
            $table->foreignId('contract_id')->constrained()->restrictOnDelete();
            $table->string('type', 20);
            $table->date('period');
            $table->string('status', 20)->default('draft');
            $table->timestamp('issued_at')->nullable();
            $table->date('due_date')->nullable();
            $table->unsignedBigInteger('total_amount')->default(0);
            $table->unsignedBigInteger('paid_amount')->default(0);
            $table->foreignId('related_invoice_id')->nullable()->constrained('invoices')->restrictOnDelete();
            $table->text('cancel_reason')->nullable();
            $table->timestamps();

            $table->unsignedBigInteger('live_monthly_contract_id')->nullable()
                ->storedAs("CASE WHEN type = 'monthly' AND status <> 'cancelled' THEN contract_id ELSE NULL END");
            $table->date('live_monthly_period')->nullable()
                ->storedAs("CASE WHEN type = 'monthly' AND status <> 'cancelled' THEN period ELSE NULL END");
            $table->unsignedBigInteger('live_final_contract_id')->nullable()
                ->storedAs("CASE WHEN type = 'final' AND status <> 'cancelled' THEN contract_id ELSE NULL END");

            $table->unique(['live_monthly_contract_id', 'live_monthly_period'], 'uq_live_monthly');
            $table->unique('live_final_contract_id', 'uq_live_final');
            $table->index(['contract_id', 'period', 'type', 'status']);
            $table->index(['status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
