<?php

namespace Tests\Feature\Database;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Nhóm 2 (M06–M12) so với docs/09_DATABASE_DESIGN.md §3.3, §3.5, §3.6, §3.8, §3.9, §3.11, §3.12 — MySQL mini_apartment_test.
 */
class GroupTwoSchemaTest extends TestCase
{
    use RefreshDatabase;

    private const TIMESTAMPS = [
        'created_at' => ['timestamp', 'YES', null],
        'updated_at' => ['timestamp', 'YES', null],
    ];

    private const ID = ['id' => ['bigint unsigned', 'NO', null]];

    /** @return array<string, array{string, array<string, array{string, string, ?string}>}> */
    public static function expectedColumns(): array
    {
        return [
            'rooms' => ['rooms', self::ID + [
                'building_id' => ['bigint unsigned', 'NO', null],
                'code' => ['varchar(50)', 'NO', null],
                'floor_number' => ['smallint unsigned', 'NO', null],
                'area' => ['decimal(8,2)', 'NO', null],
                'base_price' => ['bigint unsigned', 'NO', null],
                'deposit_amount' => ['bigint unsigned', 'NO', null],
                'max_occupants' => ['smallint unsigned', 'NO', null],
                'status' => ['varchar(20)', 'NO', 'available'],
                'is_public' => ['tinyint(1)', 'NO', '0'],
                'description' => ['text', 'YES', null],
            ] + self::TIMESTAMPS],
            'building_amenities' => ['building_amenities', [
                'building_id' => ['bigint unsigned', 'NO', null],
                'amenity_id' => ['bigint unsigned', 'NO', null],
            ]],
            'room_amenities' => ['room_amenities', [
                'room_id' => ['bigint unsigned', 'NO', null],
                'amenity_id' => ['bigint unsigned', 'NO', null],
            ]],
            'contracts' => ['contracts', self::ID + [
                'contract_number' => ['varchar(30)', 'YES', null],
                'room_id' => ['bigint unsigned', 'NO', null],
                'user_id' => ['bigint unsigned', 'NO', null],
                'status' => ['varchar(20)', 'NO', 'draft'],
                'start_date' => ['date', 'NO', null],
                'end_date' => ['date', 'NO', null],
                'activated_at' => ['timestamp', 'YES', null],
                'actual_end_date' => ['date', 'YES', null],
                'monthly_rent' => ['bigint unsigned', 'NO', null],
                'occupant_count' => ['smallint unsigned', 'NO', null],
                'initial_electricity_reading' => ['decimal(10,2)', 'YES', null],
                'initial_water_reading' => ['decimal(10,2)', 'YES', null],
                'meter_gap_reason' => ['text', 'YES', null],
                'meter_gap_confirmed_by' => ['bigint unsigned', 'YES', null],
                'deposit_amount' => ['bigint unsigned', 'NO', '0'],
                'deposit_status' => ['varchar(20)', 'NO', 'unpaid'],
                'deposit_paid_at' => ['timestamp', 'YES', null],
                'deposit_deducted_amount' => ['bigint unsigned', 'NO', '0'],
                'deposit_refund_amount' => ['bigint unsigned', 'NO', '0'],
                'deposit_settled_at' => ['timestamp', 'YES', null],
                'renewed_from_id' => ['bigint unsigned', 'YES', null],
                'closure_reason' => ['varchar(50)', 'YES', null],
                'closed_at' => ['timestamp', 'YES', null],
                'closure_note' => ['text', 'YES', null],
                'note' => ['text', 'YES', null],
                'deleted_at' => ['timestamp', 'YES', null],
                'active_room_id' => ['bigint unsigned', 'YES', null],
                'active_tenant_id' => ['bigint unsigned', 'YES', null],
            ] + self::TIMESTAMPS],
            'contract_occupants' => ['contract_occupants', self::ID + [
                'contract_id' => ['bigint unsigned', 'NO', null],
                'full_name' => ['varchar(120)', 'NO', null],
                'phone' => ['varchar(20)', 'YES', null],
                'relationship' => ['varchar(50)', 'YES', null],
            ] + self::TIMESTAMPS],
            'contract_services' => ['contract_services', self::ID + [
                'contract_id' => ['bigint unsigned', 'NO', null],
                'service_id' => ['bigint unsigned', 'NO', null],
                'quantity' => ['decimal(10,2)', 'NO', null],
                'unit_price' => ['bigint unsigned', 'YES', null],
                'start_date' => ['date', 'NO', null],
                'end_date' => ['date', 'YES', null],
            ] + self::TIMESTAMPS],
            'utility_prices' => ['utility_prices', self::ID + [
                'service_id' => ['bigint unsigned', 'NO', null],
                'unit_price' => ['bigint unsigned', 'NO', null],
                'effective_from' => ['date', 'NO', null],
            ] + self::TIMESTAMPS],
        ];
    }

    /** @param array<string, array{string, string, ?string}> $expected */
    #[DataProvider('expectedColumns')]
    public function test_columns_match_design(string $table, array $expected): void
    {
        $actual = [];
        foreach (DB::select(
            'select COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE as nullable, COLUMN_DEFAULT as `default`
             from information_schema.COLUMNS where TABLE_SCHEMA = database() and TABLE_NAME = ?',
            [$table],
        ) as $row) {
            $actual[$row->name] = [$row->type, $row->nullable, $row->default];
        }

        ksort($expected);
        ksort($actual);
        $this->assertSame($expected, $actual);
    }

    public function test_contract_active_columns_are_stored_generated_from_status(): void
    {
        $rows = DB::select(
            "select COLUMN_NAME as name, EXTRA as extra, GENERATION_EXPRESSION as expr
             from information_schema.COLUMNS
             where TABLE_SCHEMA = database() and TABLE_NAME = 'contracts' and EXTRA like '%GENERATED%'
             order by COLUMN_NAME",
        );

        $this->assertCount(2, $rows);
        foreach (['active_room_id' => 'room_id', 'active_tenant_id' => 'user_id'] as $i => $source) {
            $row = $rows[array_search($i, array_column($rows, 'name'), true)];
            $this->assertSame('STORED GENERATED', $row->extra);
            $this->assertStringContainsString("`status` = _utf8mb4\\'active\\'", $row->expr);
            $this->assertStringContainsString("then `{$source}` else NULL", $row->expr);
        }
    }

    /** @return array<string, array{string, array<string, string>}> */
    public static function expectedIndexes(): array
    {
        return [
            'rooms' => ['rooms', [
                'PRIMARY' => 'unique:id',
                'rooms_building_id_code_unique' => 'unique:building_id,code',
                'rooms_building_id_status_is_public_index' => 'index:building_id,status,is_public',
            ]],
            'building_amenities' => ['building_amenities', [
                'PRIMARY' => 'unique:building_id,amenity_id',
                'building_amenities_amenity_id_index' => 'index:amenity_id',
            ]],
            'room_amenities' => ['room_amenities', [
                'PRIMARY' => 'unique:room_id,amenity_id',
                'room_amenities_amenity_id_index' => 'index:amenity_id',
            ]],
            'contracts' => ['contracts', [
                'PRIMARY' => 'unique:id',
                'contracts_contract_number_unique' => 'unique:contract_number',
                'contracts_renewed_from_id_unique' => 'unique:renewed_from_id',
                'uq_active_contract_room' => 'unique:active_room_id',
                'uq_active_contract_tenant' => 'unique:active_tenant_id',
                'contracts_room_id_status_start_date_index' => 'index:room_id,status,start_date',
                'contracts_user_id_status_index' => 'index:user_id,status',
                'contracts_status_end_date_index' => 'index:status,end_date',
                // Index do MySQL tạo cho FK meter_gap_confirmed_by (O8, DB-D40)
                'contracts_meter_gap_confirmed_by_foreign' => 'index:meter_gap_confirmed_by',
            ]],
            // Index contract_id do MySQL tạo cho FK — đúng index (contract_id) của thiết kế §3.9.
            'contract_occupants' => ['contract_occupants', [
                'PRIMARY' => 'unique:id',
                'contract_occupants_contract_id_foreign' => 'index:contract_id',
            ]],
            // Index service_id do MySQL tạo cho FK (bắt buộc với khóa ngoại).
            'contract_services' => ['contract_services', [
                'PRIMARY' => 'unique:id',
                'contract_services_effective_index' => 'index:contract_id,service_id,start_date,end_date',
                'contract_services_service_id_foreign' => 'index:service_id',
            ]],
            'utility_prices' => ['utility_prices', [
                'PRIMARY' => 'unique:id',
                'utility_prices_service_id_effective_from_unique' => 'unique:service_id,effective_from',
            ]],
        ];
    }

    /** @param array<string, string> $expected */
    #[DataProvider('expectedIndexes')]
    public function test_indexes_match_design_without_extras(string $table, array $expected): void
    {
        $actual = [];
        foreach (DB::select(
            "select INDEX_NAME as name, max(NON_UNIQUE) as non_unique,
                    group_concat(COLUMN_NAME order by SEQ_IN_INDEX separator ',') as cols
             from information_schema.STATISTICS where TABLE_SCHEMA = database() and TABLE_NAME = ?
             group by INDEX_NAME",
            [$table],
        ) as $row) {
            $actual[$row->name] = ((int) $row->non_unique === 0 ? 'unique' : 'index').':'.$row->cols;
        }

        ksort($expected);
        ksort($actual);
        $this->assertSame($expected, $actual);
    }

    public function test_foreign_keys_and_delete_rules_match_design(): void
    {
        $actual = [];
        foreach (DB::select(
            "select k.TABLE_NAME as t, k.COLUMN_NAME as c, k.REFERENCED_TABLE_NAME as rt, k.REFERENCED_COLUMN_NAME as rc, r.DELETE_RULE as del
             from information_schema.KEY_COLUMN_USAGE k
             join information_schema.REFERENTIAL_CONSTRAINTS r
               on r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA and r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
             where k.TABLE_SCHEMA = database()
               and k.TABLE_NAME in ('rooms','building_amenities','room_amenities','contracts','contract_occupants','contract_services','utility_prices')",
        ) as $row) {
            $actual[] = "{$row->t}.{$row->c} -> {$row->rt}.{$row->rc} {$row->del}";
        }
        sort($actual);

        $this->assertSame([
            'building_amenities.amenity_id -> amenities.id CASCADE',
            'building_amenities.building_id -> buildings.id CASCADE',
            'contract_occupants.contract_id -> contracts.id RESTRICT',
            'contract_services.contract_id -> contracts.id RESTRICT',
            'contract_services.service_id -> services.id RESTRICT',
            'contracts.meter_gap_confirmed_by -> users.id RESTRICT',
            'contracts.renewed_from_id -> contracts.id RESTRICT',
            'contracts.room_id -> rooms.id RESTRICT',
            'contracts.user_id -> users.id RESTRICT',
            'room_amenities.amenity_id -> amenities.id CASCADE',
            'room_amenities.room_id -> rooms.id CASCADE',
            'rooms.building_id -> buildings.id RESTRICT',
            'utility_prices.service_id -> services.id RESTRICT',
        ], $actual);
    }
}
