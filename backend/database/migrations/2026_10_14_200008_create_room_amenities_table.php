<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** M08 — docs/09_DATABASE_DESIGN.md §3.6. Pivot tiện nghi riêng của phòng, không có Model riêng. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_amenities', function (Blueprint $table) {
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('amenity_id')->constrained()->cascadeOnDelete();

            $table->primary(['room_id', 'amenity_id']);
            $table->index('amenity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_amenities');
    }
};
