<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * M05 — docs/09_DATABASE_DESIGN.md §3.20. `key` và `group` là từ khóa MySQL:
 * Query Builder tự quote, raw SQL phải viết `key`, `group`. Không lưu secret trong settings.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 191)->unique();
            $table->text('value')->nullable();
            $table->string('type', 20);
            $table->string('group', 50);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
