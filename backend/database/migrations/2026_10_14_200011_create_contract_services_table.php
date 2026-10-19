<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M11 — docs/09_DATABASE_DESIGN.md §3.11. end_date là ngày cuối còn hiệu lực (inclusive).
 * unit_price NULL với dịch vụ metered. Chống chồng lấn khoảng ngày ở Service (khóa contracts).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained()->restrictOnDelete();
            $table->foreignId('service_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 10, 2);
            $table->unsignedBigInteger('unit_price')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->timestamps();

            // Tên tự sinh vượt giới hạn 64 ký tự của MySQL nên đặt tên tường minh.
            $table->index(['contract_id', 'service_id', 'start_date', 'end_date'], 'contract_services_effective_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_services');
    }
};
