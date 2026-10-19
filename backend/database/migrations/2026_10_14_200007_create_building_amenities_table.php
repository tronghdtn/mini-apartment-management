<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M07 — docs/09_DATABASE_DESIGN.md §3.5. Pivot tiện nghi cấp tòa (DB-D01), không có Model riêng.
 * Không sao chép tiện nghi tòa xuống từng phòng.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('building_amenities', function (Blueprint $table) {
            $table->foreignId('building_id')->constrained()->cascadeOnDelete();
            $table->foreignId('amenity_id')->constrained()->cascadeOnDelete();

            $table->primary(['building_id', 'amenity_id']);
            $table->index('amenity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('building_amenities');
    }
};
