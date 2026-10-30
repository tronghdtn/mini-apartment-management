<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('viewing_appointments', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->nullable()->unique();
            $table->foreignId('room_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('guest_name', 120);
            $table->string('guest_phone', 20);
            $table->timestamp('preferred_at');
            $table->string('status', 20)->default('pending');
            $table->text('admin_note')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('checked_out_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->text('guard_note')->nullable();
            $table->timestamps();
            $table->index(['room_id', 'preferred_at']);
            $table->index(['status', 'preferred_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['guest_phone', 'room_id', 'status']);
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('viewing_appointments') && DB::table('viewing_appointments')->exists()) {
            throw new RuntimeException('Không rollback khi còn lịch sử lịch xem phòng.');
        }
        Schema::dropIfExists('viewing_appointments');
    }
};
