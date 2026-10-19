<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M15 — docs/09_DATABASE_DESIGN.md §3.15.
 * amount là BIGINT CÓ DẤU (dòng discount âm — DB-D07); unit_price luôn không âm. HALF_UP từng dòng (App\Support\Money).
 * Chỉ tạo/hủy dòng khi hóa đơn còn draft; bất biến sau khi phát hành.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->restrictOnDelete();
            $table->string('item_type', 20);
            $table->string('description', 255);
            $table->decimal('quantity', 10, 2);
            $table->unsignedBigInteger('unit_price');
            $table->bigInteger('amount');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['invoice_id', 'item_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
