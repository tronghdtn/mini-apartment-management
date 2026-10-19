<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M14 — docs/09_DATABASE_DESIGN.md §3.13. Tạo sau invoices để khai báo FK invoice_id ngay.
 *
 * - period = ngày 01 của THÁNG TIÊU THỤ, reading_date = ngày đo thực tế (DB-D15).
 * - contract_id do backend xác định theo khoảng tiêu thụ, NULL khi phòng trống; không nhận từ client.
 * - UNIQUE(room_id, service_id, period, kind): một periodic và một final mỗi phòng/dịch vụ/kỳ.
 * - Quy tắc chuỗi chỉ số R1–R15 kiểm tra ở Service (DATABASE_IMPLEMENTATION_PLAN.md §5) — không thay bằng ràng buộc DB.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meter_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->restrictOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('service_id')->constrained()->restrictOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('kind', 20);
            $table->date('period');
            $table->date('reading_date');
            $table->decimal('previous_reading', 10, 2);
            $table->decimal('current_reading', 10, 2);
            $table->decimal('consumption', 10, 2);
            $table->unsignedBigInteger('unit_price');
            $table->unsignedBigInteger('amount');
            $table->timestamps();

            $table->unique(['room_id', 'service_id', 'period', 'kind']);
            $table->index(['room_id', 'service_id', 'reading_date']);
            $table->index(['contract_id', 'period']);
            $table->index('invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meter_readings');
    }
};
