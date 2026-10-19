<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M04 — docs/09_DATABASE_DESIGN.md §3.10. name UNIQUE toàn bảng (DB-D16).
 * price NULL chỉ với billing_type = metered (kiểm tra ở FormRequest/Service — DB-D20).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 120)->unique();
            $table->string('billing_type', 20);
            $table->string('unit', 20)->nullable();
            $table->unsignedBigInteger('price')->nullable();
            $table->string('status', 20)->default('active');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
