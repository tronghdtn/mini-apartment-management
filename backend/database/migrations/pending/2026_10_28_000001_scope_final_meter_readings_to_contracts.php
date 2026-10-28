<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** DB-D65/68 U3: explicit-path preparation/test only; no dev migration authorization. */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('meter_readings', 'periodic_vacant_room_id') || Schema::hasColumn('meter_readings', 'periodic_contract_id') || Schema::hasColumn('meter_readings', 'final_contract_id')) {
            throw new RuntimeException('Đã có khóa U3; kiểm tra trạng thái migration trước khi chạy tiếp.');
        }
        $invalidOwner = DB::table('meter_readings as reading')->leftJoin('contracts as contract', 'contract.id', '=', 'reading.contract_id')
            ->where(function ($query): void {
                $query->where('reading.kind', 'final')->whereNull('reading.contract_id');
            })->orWhere(function ($query): void {
                $query->whereNotNull('reading.contract_id')->where(function ($owner): void {
                    $owner->whereNull('contract.id')->orWhereColumn('reading.room_id', '<>', 'contract.room_id');
                });
            })->exists();
        $duplicateFinal = DB::table('meter_readings')->where('kind', 'final')->select('contract_id', 'service_id')
            ->groupBy('contract_id', 'service_id')->havingRaw('COUNT(*) > 1')->exists();
        if ($invalidOwner || $duplicateFinal) {
            throw new RuntimeException('Lịch sử chỉ số thiếu/sai hợp đồng hoặc trùng lần thanh lý; cần đối chiếu trước U3, không tự sửa dữ liệu.');
        }

        // One atomic MySQL 8 ALTER: existing FKs retain their independent indexes.
        DB::statement(<<<'SQL'
            ALTER TABLE meter_readings
              ADD COLUMN periodic_vacant_room_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN kind = 'periodic' AND contract_id IS NULL THEN room_id ELSE NULL END) STORED,
              ADD COLUMN periodic_contract_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN kind = 'periodic' THEN contract_id ELSE NULL END) STORED,
              ADD COLUMN final_contract_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN kind = 'final' THEN contract_id ELSE NULL END) STORED,
              ADD UNIQUE KEY uq_meter_periodic_vacancy_service_period (periodic_vacant_room_id, service_id, period),
              ADD UNIQUE KEY uq_meter_periodic_contract_service_period (periodic_contract_id, service_id, period),
              ADD UNIQUE KEY uq_meter_final_contract_service (final_contract_id, service_id),
              ADD CONSTRAINT ck_meter_final_requires_contract CHECK (kind <> 'final' OR contract_id IS NOT NULL),
              DROP INDEX meter_readings_room_id_service_id_period_kind_unique
            SQL);
    }

    public function down(): void
    {
        $incompatible = DB::table('meter_readings')->select('room_id', 'service_id', 'period', 'kind')
            ->groupBy('room_id', 'service_id', 'period', 'kind')->havingRaw('COUNT(*) > 1')->exists();
        if ($incompatible) {
            throw new RuntimeException('Có nhiều chỉ số theo hợp đồng cùng phòng/dịch vụ/kỳ; không tự rollback làm mất lịch sử U3.');
        }

        DB::statement(<<<'SQL'
            ALTER TABLE meter_readings
              ADD UNIQUE KEY meter_readings_room_id_service_id_period_kind_unique (room_id, service_id, period, kind),
              DROP CHECK ck_meter_final_requires_contract,
              DROP INDEX uq_meter_periodic_vacancy_service_period,
              DROP INDEX uq_meter_periodic_contract_service_period,
              DROP INDEX uq_meter_final_contract_service,
              DROP COLUMN periodic_vacant_room_id,
              DROP COLUMN periodic_contract_id,
              DROP COLUMN final_contract_id
            SQL);
    }
};
