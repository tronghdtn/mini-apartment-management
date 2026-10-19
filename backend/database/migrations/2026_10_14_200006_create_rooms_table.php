<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** M06 — docs/09_DATABASE_DESIGN.md §3.3. floor_number trong 1..total_floors kiểm tra ở FormRequest/Service (DB-D20). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('building_id')->constrained()->restrictOnDelete();
            $table->string('code', 50);
            $table->unsignedSmallInteger('floor_number');
            $table->decimal('area', 8, 2);
            $table->unsignedBigInteger('base_price');
            $table->unsignedBigInteger('deposit_amount');
            $table->unsignedSmallInteger('max_occupants');
            $table->string('status', 20)->default('available');
            $table->boolean('is_public')->default(false);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['building_id', 'code']);
            $table->index(['building_id', 'status', 'is_public']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
