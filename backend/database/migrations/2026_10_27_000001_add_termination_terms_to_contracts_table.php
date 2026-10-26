<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** P4/P5-B, DB-D61: nullable snapshots preserve existing contracts; no implied fee. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table): void {
            $table->string('early_termination_fee_type', 20)->nullable();
            $table->unsignedBigInteger('early_termination_fee_amount')->nullable();
            $table->decimal('early_termination_fee_multiplier', 5, 2)->nullable();
            $table->json('early_termination_waiver_conditions')->nullable();
            $table->string('early_termination_waiver_code', 50)->nullable();
            $table->foreignId('early_termination_waived_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('early_termination_waived_at')->nullable();
            $table->text('early_termination_waiver_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table): void {
            $table->dropForeign(['early_termination_waived_by']);
            $table->dropColumn([
                'early_termination_fee_type', 'early_termination_fee_amount', 'early_termination_fee_multiplier',
                'early_termination_waiver_conditions', 'early_termination_waiver_code', 'early_termination_waived_by',
                'early_termination_waived_at', 'early_termination_waiver_note',
            ]);
        });
    }
};
