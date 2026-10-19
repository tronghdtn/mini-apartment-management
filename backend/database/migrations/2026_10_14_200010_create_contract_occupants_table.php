<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** M10 — docs/09_DATABASE_DESIGN.md §3.9. Người ở cùng, không bắt buộc có tài khoản (DB-D06). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_occupants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained()->restrictOnDelete();
            $table->string('full_name', 120);
            $table->string('phone', 20)->nullable();
            $table->string('relationship', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_occupants');
    }
};
