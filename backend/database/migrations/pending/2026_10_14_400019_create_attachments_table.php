<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** M19 / DB-D64: preparation only; not included in default migrate. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->string('attachable_type', 100);
            $table->unsignedBigInteger('attachable_id');
            $table->string('collection', 50);
            $table->string('disk', 20);
            $table->string('path', 500);
            $table->string('original_name', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->boolean('is_cover')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['attachable_type', 'attachable_id', 'collection'], 'attachments_parent_collection_index');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('attachments') && DB::table('attachments')->exists()) {
            throw new RuntimeException('Không rollback khi còn metadata tệp; cần phương án bảo toàn tệp và lịch sử.');
        }

        Schema::dropIfExists('attachments');
    }
};
