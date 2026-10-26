<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * U1/DB-D63 preparation ONLY: explicit-path tests, not in the default migration set.
 * Promote only with the building-scoped API and a separately approved dev migration window.
 * MySQL DDL auto-commits: stop and inspect after any failure; never rerun a partial ALTER blindly.
 */
return new class extends Migration
{
    private const UNIQUE_NAME = 'uq_utility_price_building_service_date';

    private const SERVICE_INDEX = 'ix_utility_prices_service';

    public function up(): void
    {
        if (Schema::hasColumn('utility_prices', 'building_id')) {
            throw new RuntimeException('Đã có building_id; kiểm tra trạng thái migration trước khi chạy tiếp.');
        }
        $buildingIds = DB::table('buildings')->orderBy('id')->pluck('id')->all();
        $legacyPrices = DB::table('utility_prices')->orderBy('id')->get();
        if ($legacyPrices->isNotEmpty() && $buildingIds === []) {
            throw new RuntimeException('Có lịch sử giá nhưng không có tòa nhà; cần ánh xạ trước migration.');
        }

        Schema::table('utility_prices', function (Blueprint $table): void {
            $table->foreignId('building_id')->nullable()->constrained()->restrictOnDelete();
            // The old UNIQUE also supports service_id's FK. Install its replacement first.
            $table->index('service_id', self::SERVICE_INDEX);
        });
        Schema::table('utility_prices', function (Blueprint $table): void {
            $table->dropUnique(['service_id', 'effective_from']);
            $table->unique(['building_id', 'service_id', 'effective_from'], self::UNIQUE_NAME);
        });
        DB::transaction(function () use ($buildingIds, $legacyPrices): void {
            foreach ($legacyPrices as $price) {
                // Retain each original ID on the earliest building; other buildings receive exact history copies.
                DB::table('utility_prices')->where('id', $price->id)->update(['building_id' => $buildingIds[0]]);
                foreach (array_slice($buildingIds, 1) as $buildingId) {
                    $copy = (array) $price;
                    unset($copy['id']);
                    DB::table('utility_prices')->insert([...$copy, 'building_id' => $buildingId]);
                }
            }
            if (DB::table('utility_prices')->whereNull('building_id')->exists()
                || DB::table('utility_prices')->count() !== $legacyPrices->count() * count($buildingIds)) {
                throw new RuntimeException('Đối chiếu lịch sử giá không khớp; dừng để kiểm tra.');
            }
        });
        Schema::table('utility_prices', function (Blueprint $table): void {
            $table->unsignedBigInteger('building_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        $buildingIds = DB::table('buildings')->orderBy('id')->pluck('id')->all();
        $groups = DB::table('utility_prices')->orderBy('id')->get()
            ->groupBy(fn ($price): string => $price->service_id.':'.$price->effective_from);
        foreach ($groups as $prices) {
            $ids = $prices->pluck('building_id')->sort()->values()->all();
            $snapshots = $prices->map(fn ($price): array => [
                $price->unit_price, $price->created_at, $price->updated_at,
            ])->uniqueStrict();
            if ($ids !== $buildingIds || $snapshots->count() !== 1) {
                throw new RuntimeException('Giá theo tòa đã khác nhau hoặc có tòa mới; không tự rollback làm mất lịch sử.');
            }
        }
        DB::transaction(function () use ($groups): void {
            foreach ($groups as $prices) {
                // Only identical copies can collapse back into the original global row.
                DB::table('utility_prices')->whereIn('id', $prices->skip(1)->pluck('id'))->delete();
            }
        });
        // Restore an index supporting the service FK before removing the scoped indexes.
        Schema::table('utility_prices', function (Blueprint $table): void {
            $table->unique(['service_id', 'effective_from']);
        });
        Schema::table('utility_prices', function (Blueprint $table): void {
            $table->dropForeign(['building_id']);
            $table->dropUnique(self::UNIQUE_NAME);
            $table->dropColumn('building_id');
            $table->dropIndex(self::SERVICE_INDEX);
        });
    }
};
