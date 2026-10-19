<?php

namespace Tests\Feature\Database;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Rollback từng nhóm migration nghiệp vụ (kèm mọi nhóm sau nó) rồi migrate lại — chỉ trên mini_apartment_test.
 * Số bước tính từ danh sách file migration nên không phải sửa khi thêm nhóm mới; chỉ cần khai báo nhóm.
 * Không dùng RefreshDatabase (DDL MySQL tự commit); luôn migrate lại ở cuối để không ảnh hưởng test khác.
 */
class MigrationRollbackTest extends TestCase
{
    /** @var array<string, list<string>> migration đầu tiên của nhóm => bảng nhóm tạo mới */
    private const GROUPS = [
        '2026_10_14_100001_alter_users_table_for_apartment_profile' => ['buildings', 'amenities', 'services', 'settings'],
        '2026_10_14_200006_create_rooms_table' => ['rooms', 'building_amenities', 'room_amenities', 'contracts', 'contract_occupants', 'contract_services', 'utility_prices'],
        '2026_10_14_300013_create_invoices_table' => ['invoices', 'meter_readings', 'invoice_items', 'payments'],
    ];

    /** @return array<string, array{string}> */
    public static function migrationGroups(): array
    {
        return [
            'Nhóm 1 (M01–M05)' => ['2026_10_14_100001_alter_users_table_for_apartment_profile'],
            'Nhóm 2 (M06–M12)' => ['2026_10_14_200006_create_rooms_table'],
            'Nhóm 3 (M13–M16)' => ['2026_10_14_300013_create_invoices_table'],
        ];
    }

    #[DataProvider('migrationGroups')]
    public function test_group_rolls_back_with_later_groups_and_migrates_again(string $firstMigration): void
    {
        Artisan::call('migrate', ['--force' => true]);

        $migrations = collect(glob(database_path('migrations/*.php')))
            ->map(fn (string $path) => basename($path, '.php'))
            ->sort()
            ->values();
        $steps = $migrations->filter(fn (string $name) => strcmp($name, $firstMigration) >= 0)->count();

        $removed = [];
        $kept = [];
        foreach (self::GROUPS as $groupStart => $tables) {
            if (strcmp($groupStart, $firstMigration) >= 0) {
                $removed = [...$removed, ...$tables];
            } else {
                $kept = [...$kept, ...$tables];
            }
        }

        try {
            $this->assertSame(0, Artisan::call('migrate:rollback', ['--step' => $steps, '--force' => true]));

            foreach ($removed as $table) {
                $this->assertFalse(Schema::hasTable($table), "{$table} phải bị xóa khi rollback");
            }
            foreach ($kept as $table) {
                $this->assertTrue(Schema::hasTable($table), "{$table} của nhóm trước phải được giữ");
            }
            $this->assertTrue(Schema::hasTable('sessions'), 'Bảng framework không bị ảnh hưởng');

            if ($firstMigration === array_key_first(self::GROUPS)) {
                $this->assertTrue(Schema::hasColumn('users', 'name'), 'M01 down() khôi phục users.name');
                $this->assertFalse(Schema::hasColumn('users', 'phone'));
                $this->assertTrue(Schema::hasColumn('users', 'email_verified_at'));
            }
        } finally {
            $this->assertSame(0, Artisan::call('migrate', ['--force' => true]));
        }

        foreach ($removed as $table) {
            $this->assertTrue(Schema::hasTable($table), "{$table} phải được tạo lại");
        }
        $this->assertTrue(Schema::hasColumns('users', ['full_name', 'phone', 'role', 'status', 'id_number']));
    }
}
