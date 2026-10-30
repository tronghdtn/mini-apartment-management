<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** P6 / DB-D67: prepared for isolated test use; never included in default migrate. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table): void {
            $table->string('inspection_result', 20)->nullable();
            $table->foreignId('inspected_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('inspected_at')->nullable();
            $table->text('inspection_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table): void {
            $table->dropForeign(['inspected_by']);
            $table->dropColumn(['inspection_result', 'inspected_by', 'inspected_at', 'inspection_note']);
        });
    }
};
