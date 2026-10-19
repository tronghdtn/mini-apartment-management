<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M12 — docs/09_DATABASE_DESIGN.md §3.12. Chỉ dịch vụ metered có giá.
 * effective_from luôn là ngày 01 (DB-D26) và không được làm thay đổi kỳ đã có chỉ số/hóa đơn (DB-D33)
 * — kiểm tra ở FormRequest/Service. Không seed giá mẫu (DB-D18).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('utility_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('unit_price');
            $table->date('effective_from');
            $table->timestamps();

            $table->unique(['service_id', 'effective_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('utility_prices');
    }
};
