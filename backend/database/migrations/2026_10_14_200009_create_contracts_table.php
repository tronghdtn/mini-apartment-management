<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M09 — docs/09_DATABASE_DESIGN.md §3.8, §6.1.
 *
 * - Một hợp đồng active mỗi phòng và mỗi người đại diện: generated column STORED + UNIQUE
 *   (MySQL không có partial index). Biểu thức dùng chuỗi 'active' = ContractStatus::Active.
 * - end_date (dự kiến) và actual_end_date (thực tế) đều là ngày BÀN GIAO, mốc LOẠI TRỪ:
 *   ngày tính tiền = [start_date, actual_end_date) (DB-D32, DB-D39).
 * - contract_number NULL đến khi kích hoạt (DB-D13). Chỉ soft-delete hợp đồng draft.
 * - FK của room_id/user_id phải là RESTRICT: MySQL cấm CASCADE/SET NULL trên cột gốc của generated column.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->string('contract_number', 30)->nullable()->unique();
            $table->foreignId('room_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->default('draft');
            $table->date('start_date');
            $table->date('end_date');
            $table->timestamp('activated_at')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->unsignedBigInteger('monthly_rent');
            $table->unsignedSmallInteger('occupant_count');
            $table->decimal('initial_electricity_reading', 10, 2)->nullable();
            $table->decimal('initial_water_reading', 10, 2)->nullable();
            // O8 (DB-D40): chỉ số đầu cao hơn mốc chốt gần nhất → lý do + Admin xác nhận; thời điểm xác nhận = activated_at.
            $table->text('meter_gap_reason')->nullable();
            $table->foreignId('meter_gap_confirmed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->unsignedBigInteger('deposit_amount')->default(0);
            $table->string('deposit_status', 20)->default('unpaid');
            $table->timestamp('deposit_paid_at')->nullable();
            $table->unsignedBigInteger('deposit_deducted_amount')->default(0);
            $table->unsignedBigInteger('deposit_refund_amount')->default(0);
            $table->timestamp('deposit_settled_at')->nullable();
            $table->foreignId('renewed_from_id')->nullable()->unique()->constrained('contracts')->restrictOnDelete();
            $table->string('closure_reason', 50)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('closure_note')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unsignedBigInteger('active_room_id')->nullable()
                ->storedAs("CASE WHEN status = 'active' THEN room_id ELSE NULL END");
            $table->unsignedBigInteger('active_tenant_id')->nullable()
                ->storedAs("CASE WHEN status = 'active' THEN user_id ELSE NULL END");

            $table->unique('active_room_id', 'uq_active_contract_room');
            $table->unique('active_tenant_id', 'uq_active_contract_tenant');
            $table->index(['room_id', 'status', 'start_date']);
            $table->index(['user_id', 'status']);
            $table->index(['status', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
