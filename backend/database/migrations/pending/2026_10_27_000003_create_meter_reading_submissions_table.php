<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** DB-D64 / U2: no official reading or charge is created by a submission. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meter_reading_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->restrictOnDelete();
            $table->foreignId('contract_id')->constrained()->restrictOnDelete();
            $table->foreignId('service_id')->constrained()->restrictOnDelete();
            $table->date('period');
            $table->date('reading_date');
            $table->decimal('current_reading', 10, 2);
            $table->string('status', 20)->default('pending');
            $table->foreignId('submitted_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_meter_reading_id')->nullable()->constrained('meter_readings')->restrictOnDelete();
            $table->timestamps();
            $table->unsignedTinyInteger('pending_slot')->nullable()->storedAs("CASE WHEN status = 'pending' THEN 1 ELSE NULL END");
            $table->unique(['room_id', 'service_id', 'period', 'pending_slot'], 'mtr_submissions_pending_unique');
            $table->unique('approved_meter_reading_id', 'mtr_submissions_approved_reading_unique');
            $table->index(['contract_id', 'period'], 'mtr_submissions_contract_period_index');
            $table->index(['status', 'created_at'], 'mtr_submissions_queue_index');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('meter_reading_submissions') && DB::table('meter_reading_submissions')->exists()) {
            throw new RuntimeException('Không rollback khi còn yêu cầu chỉ số; cần bảo toàn lịch sử trước.');
        }
        // Polymorphic attachments have no SQL foreign key to protect them.
        if (Schema::hasTable('attachments') && DB::table('attachments')->where('attachable_type', 'meter_reading_submission')->exists()) {
            throw new RuntimeException('Không rollback khi còn metadata ảnh yêu cầu chỉ số.');
        }

        Schema::dropIfExists('meter_reading_submissions');
    }
};
