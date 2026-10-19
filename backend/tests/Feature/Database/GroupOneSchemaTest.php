<?php

namespace Tests\Feature\Database;

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Nhóm 1 (M01–M05) so với docs/09_DATABASE_DESIGN.md §3.1, §3.2, §3.4, §3.10, §3.20 — chạy trên MySQL mini_apartment_test.
 */
class GroupOneSchemaTest extends TestCase
{
    use RefreshDatabase;

    private const TIMESTAMPS = [
        'created_at' => ['timestamp', 'YES', null],
        'updated_at' => ['timestamp', 'YES', null],
    ];

    /** @return array<string, array{string, array<string, array{string, string, ?string}>}> */
    public static function expectedColumns(): array
    {
        return [
            'users' => ['users', [
                'id' => ['bigint unsigned', 'NO', null],
                'full_name' => ['varchar(120)', 'NO', null],
                'email' => ['varchar(191)', 'NO', null],
                'phone' => ['varchar(20)', 'NO', null],
                'email_verified_at' => ['timestamp', 'YES', null],
                'password' => ['varchar(255)', 'NO', null],
                'role' => ['varchar(20)', 'NO', 'user'],
                'status' => ['varchar(20)', 'NO', 'active'],
                'id_number' => ['varchar(20)', 'YES', null],
                'date_of_birth' => ['date', 'YES', null],
                'gender' => ['varchar(20)', 'YES', null],
                'permanent_address' => ['text', 'YES', null],
                'remember_token' => ['varchar(100)', 'YES', null],
            ] + self::TIMESTAMPS],
            'buildings' => ['buildings', [
                'id' => ['bigint unsigned', 'NO', null],
                'name' => ['varchar(150)', 'NO', null],
                'address' => ['varchar(500)', 'NO', null],
                'total_floors' => ['smallint unsigned', 'NO', null],
                'latitude' => ['decimal(10,7)', 'YES', null],
                'longitude' => ['decimal(10,7)', 'YES', null],
                'description' => ['text', 'YES', null],
                'status' => ['varchar(20)', 'NO', 'active'],
            ] + self::TIMESTAMPS],
            'amenities' => ['amenities', [
                'id' => ['bigint unsigned', 'NO', null],
                'name' => ['varchar(120)', 'NO', null],
                'description' => ['text', 'YES', null],
                'deleted_at' => ['timestamp', 'YES', null],
            ] + self::TIMESTAMPS],
            'services' => ['services', [
                'id' => ['bigint unsigned', 'NO', null],
                'code' => ['varchar(50)', 'NO', null],
                'name' => ['varchar(120)', 'NO', null],
                'billing_type' => ['varchar(20)', 'NO', null],
                'unit' => ['varchar(20)', 'YES', null],
                'price' => ['bigint unsigned', 'YES', null],
                'status' => ['varchar(20)', 'NO', 'active'],
                'description' => ['text', 'YES', null],
            ] + self::TIMESTAMPS],
            'settings' => ['settings', [
                'id' => ['bigint unsigned', 'NO', null],
                'key' => ['varchar(191)', 'NO', null],
                'value' => ['text', 'YES', null],
                'type' => ['varchar(20)', 'NO', null],
                'group' => ['varchar(50)', 'NO', null],
            ] + self::TIMESTAMPS],
        ];
    }

    /** @param array<string, array{string, string, ?string}> $expected */
    #[DataProvider('expectedColumns')]
    public function test_columns_match_design(string $table, array $expected): void
    {
        $rows = DB::select(
            'select COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE as nullable, COLUMN_DEFAULT as `default`
             from information_schema.COLUMNS where TABLE_SCHEMA = database() and TABLE_NAME = ?',
            [$table],
        );

        $actual = [];
        foreach ($rows as $row) {
            $actual[$row->name] = [$row->type, $row->nullable, $row->default];
        }

        ksort($expected);
        ksort($actual);
        $this->assertSame($expected, $actual);
    }

    /** @return array<string, array{string, array<string, string>}> */
    public static function expectedIndexes(): array
    {
        // tên index => "unique|index:cột1,cột2"
        return [
            'users' => ['users', [
                'PRIMARY' => 'unique:id',
                'users_email_unique' => 'unique:email',
                'users_phone_unique' => 'unique:phone',
                'users_id_number_unique' => 'unique:id_number',
                'users_role_status_index' => 'index:role,status',
            ]],
            'buildings' => ['buildings', ['PRIMARY' => 'unique:id', 'buildings_name_unique' => 'unique:name']],
            'amenities' => ['amenities', ['PRIMARY' => 'unique:id', 'amenities_name_unique' => 'unique:name']],
            'services' => ['services', [
                'PRIMARY' => 'unique:id',
                'services_code_unique' => 'unique:code',
                'services_name_unique' => 'unique:name',
            ]],
            'settings' => ['settings', ['PRIMARY' => 'unique:id', 'settings_key_unique' => 'unique:key']],
        ];
    }

    /** @param array<string, string> $expected */
    #[DataProvider('expectedIndexes')]
    public function test_indexes_match_design_without_extras(string $table, array $expected): void
    {
        $rows = DB::select(
            "select INDEX_NAME as name, max(NON_UNIQUE) as non_unique,
                    group_concat(COLUMN_NAME order by SEQ_IN_INDEX separator ',') as cols
             from information_schema.STATISTICS where TABLE_SCHEMA = database() and TABLE_NAME = ?
             group by INDEX_NAME",
            [$table],
        );

        $actual = [];
        foreach ($rows as $row) {
            $actual[$row->name] = ((int) $row->non_unique === 0 ? 'unique' : 'index').':'.$row->cols;
        }

        ksort($expected);
        ksort($actual);
        $this->assertSame($expected, $actual);
    }

    public function test_user_defaults_and_unique_constraints(): void
    {
        $this->insertUser(['email' => 'a@example.com', 'phone' => '0900000001']);

        $row = DB::table('users')->where('email', 'a@example.com')->first();
        $this->assertSame('user', $row->role);
        $this->assertSame('active', $row->status);

        $this->assertDuplicateRejected(fn () => $this->insertUser(['email' => 'a@example.com', 'phone' => '0900000002']));
        $this->assertDuplicateRejected(fn () => $this->insertUser(['email' => 'b@example.com', 'phone' => '0900000001']));

        $this->insertUser(['email' => 'c@example.com', 'phone' => '0900000003', 'id_number' => '001200000001']);
        $this->assertDuplicateRejected(fn () => $this->insertUser(['email' => 'd@example.com', 'phone' => '0900000004', 'id_number' => '001200000001']));

        // Nhiều tài khoản chưa khai CCCD (NULL) vẫn hợp lệ
        $this->insertUser(['email' => 'e@example.com', 'phone' => '0900000005']);
        $this->assertSame(2, DB::table('users')->whereNull('id_number')->count());
    }

    public function test_catalog_unique_constraints(): void
    {
        DB::table('buildings')->insert(['name' => 'Tòa A', 'address' => '1 Đường X', 'total_floors' => 5]);
        $this->assertDuplicateRejected(fn () => DB::table('buildings')->insert(['name' => 'Tòa A', 'address' => '2 Đường Y', 'total_floors' => 3]));

        DB::table('amenities')->insert(['name' => 'Thang máy']);
        $this->assertDuplicateRejected(fn () => DB::table('amenities')->insert(['name' => 'Thang máy']));

        DB::table('services')->insert(['code' => 'INTERNET', 'name' => 'Internet', 'billing_type' => 'per_room', 'price' => 100000]);
        $this->assertDuplicateRejected(fn () => DB::table('services')->insert(['code' => 'INTERNET', 'name' => 'Internet 2', 'billing_type' => 'per_room', 'price' => 1]));
        // DB-D16: tên trùng bị chặn kể cả khi dịch vụ cũ inactive
        DB::table('services')->where('code', 'INTERNET')->update(['status' => 'inactive']);
        $this->assertDuplicateRejected(fn () => DB::table('services')->insert(['code' => 'NET2', 'name' => 'Internet', 'billing_type' => 'per_room', 'price' => 1]));

        DB::table('settings')->insert(['key' => 'invoice.due_days', 'value' => '5', 'type' => 'integer', 'group' => 'invoice']);
        $this->assertDuplicateRejected(fn () => DB::table('settings')->insert(['key' => 'invoice.due_days', 'value' => '7', 'type' => 'integer', 'group' => 'invoice']));
    }

    public function test_metered_service_allows_null_price_and_unsigned_columns_reject_negatives(): void
    {
        DB::table('services')->insert(['code' => 'ELECTRICITY', 'name' => 'Điện', 'billing_type' => 'metered', 'unit' => 'kWh', 'price' => null]);
        $this->assertNull(DB::table('services')->where('code', 'ELECTRICITY')->value('price'));

        $this->assertOutOfRange(fn () => DB::table('services')->insert(['code' => 'X', 'name' => 'X', 'billing_type' => 'per_room', 'price' => -1]));
        $this->assertOutOfRange(fn () => DB::table('buildings')->insert(['name' => 'Tòa B', 'address' => 'x', 'total_floors' => -1]));
    }

    public function test_reserved_word_columns_work_through_query_builder(): void
    {
        DB::table('settings')->insert(['key' => 'system.name', 'value' => 'Mini Apartment', 'type' => 'string', 'group' => 'system']);

        $this->assertSame('Mini Apartment', DB::table('settings')->where('group', 'system')->where('key', 'system.name')->value('value'));
    }

    /** @param array<string, mixed> $overrides */
    private function insertUser(array $overrides): void
    {
        DB::table('users')->insert($overrides + ['full_name' => 'Nguyễn Văn A', 'password' => 'x']);
    }

    private function assertDuplicateRejected(callable $insert): void
    {
        try {
            $insert();
            $this->fail('Bản ghi trùng phải bị UNIQUE chặn');
        } catch (QueryException $e) {
            $this->assertSame(1062, $e->errorInfo[1] ?? null, $e->getMessage()); // ER_DUP_ENTRY
        }
    }

    private function assertOutOfRange(callable $insert): void
    {
        try {
            $insert();
            $this->fail('Giá trị âm phải bị cột UNSIGNED chặn');
        } catch (QueryException $e) {
            $this->assertSame(1264, $e->errorInfo[1] ?? null, $e->getMessage()); // ER_WARN_DATA_OUT_OF_RANGE
        }
    }
}
