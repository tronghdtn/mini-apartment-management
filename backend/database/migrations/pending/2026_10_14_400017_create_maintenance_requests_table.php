<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** M17 / DB-D50: prepare/test only; never included in the development migration set. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->nullable()->unique();
            $table->foreignId('contract_id')->constrained()->restrictOnDelete();
            $table->foreignId('room_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('title', 150);
            $table->text('description');
            $table->string('priority', 20)->default('normal');
            $table->string('status', 20)->default('pending');
            $table->text('admin_note')->nullable();
            $table->text('handler_note')->nullable();
            $table->unsignedBigInteger('cost')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['contract_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['assigned_to', 'status']);
            $table->index(['status', 'priority', 'created_at']);
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('maintenance_requests') && DB::table('maintenance_requests')->exists()) {
            throw new RuntimeException('Không rollback khi còn yêu cầu sửa chữa; cần phương án bảo toàn lịch sử.');
        }

        Schema::dropIfExists('maintenance_requests');
    }
};
