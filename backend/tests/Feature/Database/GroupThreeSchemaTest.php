<?php

namespace Tests\Feature\Database;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** Nhóm 3 (M13–M16) so với docs/09_DATABASE_DESIGN.md §3.13–§3.16, §6.2 — MySQL mini_apartment_test. */
class GroupThreeSchemaTest extends TestCase
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
            'invoices' => ['invoices', self::ID + [
                'invoice_number' => ['varchar(30)', 'YES', null],
                'contract_id' => ['bigint unsigned', 'NO', null],
                'type' => ['varchar(20)', 'NO', null],
                'period' => ['date', 'NO', null],
                'status' => ['varchar(20)', 'NO', 'draft'],
                'issued_at' => ['timestamp', 'YES', null],
                'due_date' => ['date', 'YES', null],
                'total_amount' => ['bigint unsigned', 'NO', '0'],
                'paid_amount' => ['bigint unsigned', 'NO', '0'],
                'related_invoice_id' => ['bigint unsigned', 'YES', null],
                'cancel_reason' => ['text', 'YES', null],
                'live_monthly_contract_id' => ['bigint unsigned', 'YES', null],
                'live_monthly_period' => ['date', 'YES', null],
                'live_final_contract_id' => ['bigint unsigned', 'YES', null],
            ] + self::TIMESTAMPS],
            'meter_readings' => ['meter_readings', self::ID + [
                'room_id' => ['bigint unsigned', 'NO', null],
                'contract_id' => ['bigint unsigned', 'YES', null],
                'service_id' => ['bigint unsigned', 'NO', null],
                'invoice_id' => ['bigint unsigned', 'YES', null],
                'kind' => ['varchar(20)', 'NO', null],
                'period' => ['date', 'NO', null],
                'reading_date' => ['date', 'NO', null],
                'previous_reading' => ['decimal(10,2)', 'NO', null],
                'current_reading' => ['decimal(10,2)', 'NO', null],
                'consumption' => ['decimal(10,2)', 'NO', null],
                'unit_price' => ['bigint unsigned', 'NO', null],
                'amount' => ['bigint unsigned', 'NO', null],
            ] + self::TIMESTAMPS],
            'invoice_items' => ['invoice_items', self::ID + [
                'invoice_id' => ['bigint unsigned', 'NO', null],
                'item_type' => ['varchar(20)', 'NO', null],
                'description' => ['varchar(255)', 'NO', null],
                'quantity' => ['decimal(10,2)', 'NO', null],
                'unit_price' => ['bigint unsigned', 'NO', null],
                'amount' => ['bigint', 'NO', null],   // CÓ DẤU (DB-D07)
                'meta' => ['json', 'YES', null],
            ] + self::TIMESTAMPS],
            'payments' => ['payments', self::ID + [
                'invoice_id' => ['bigint unsigned', 'NO', null],
                'amount' => ['bigint unsigned', 'NO', null],
                'method' => ['varchar(20)', 'NO', null],
                'status' => ['varchar(20)', 'NO', null],  // không có default theo thiết kế
                'receipt_number' => ['varchar(30)', 'YES', null],
                'submitted_by' => ['bigint unsigned', 'YES', null],
                'reviewed_by' => ['bigint unsigned', 'YES', null],
                'reviewed_at' => ['timestamp', 'YES', null],
                'reject_reason' => ['text', 'YES', null],
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

    public function test_invoice_live_columns_are_stored_generated_with_design_expressions(): void
    {
        $rows = [];
        foreach (DB::select(
            "select COLUMN_NAME as name, EXTRA as extra, GENERATION_EXPRESSION as expr from information_schema.COLUMNS
             where TABLE_SCHEMA = database() and TABLE_NAME = 'invoices' and EXTRA like '%GENERATED%'",
        ) as $row) {
            $rows[$row->name] = $row;
        }

        $this->assertEqualsCanonicalizing(['live_monthly_contract_id', 'live_monthly_period', 'live_final_contract_id'], array_keys($rows));
        $expect = [
            'live_monthly_contract_id' => ['monthly', 'contract_id'],
            'live_monthly_period' => ['monthly', 'period'],
            'live_final_contract_id' => ['final', 'contract_id'],
        ];
        foreach ($expect as $column => [$type, $source]) {
            $this->assertSame('STORED GENERATED', $rows[$column]->extra);
            $this->assertStringContainsString("`type` = _utf8mb4\\'{$type}\\'", $rows[$column]->expr);
            $this->assertStringContainsString("`status` <> _utf8mb4\\'cancelled\\'", $rows[$column]->expr);
            $this->assertStringContainsString("then `{$source}` else NULL", $rows[$column]->expr);
        }
    }

    /** @return array<string, array{string, array<string, string>}> */
    public static function expectedIndexes(): array
    {
        return [
            'invoices' => ['invoices', [
                'PRIMARY' => 'unique:id',
                'invoices_invoice_number_unique' => 'unique:invoice_number',
                'uq_live_monthly' => 'unique:live_monthly_contract_id,live_monthly_period',
                'uq_live_final' => 'unique:live_final_contract_id',
                'invoices_contract_id_period_type_status_index' => 'index:contract_id,period,type,status',
                'invoices_status_due_date_index' => 'index:status,due_date',
                'invoices_related_invoice_id_foreign' => 'index:related_invoice_id',
            ]],
            'meter_readings' => ['meter_readings', [
                'PRIMARY' => 'unique:id',
                'meter_readings_room_id_service_id_period_kind_unique' => 'unique:room_id,service_id,period,kind',
                'meter_readings_room_id_service_id_reading_date_index' => 'index:room_id,service_id,reading_date',
                'meter_readings_contract_id_period_index' => 'index:contract_id,period',
                'meter_readings_invoice_id_index' => 'index:invoice_id',
                'meter_readings_service_id_foreign' => 'index:service_id',
            ]],
            'invoice_items' => ['invoice_items', [
                'PRIMARY' => 'unique:id',
                'invoice_items_invoice_id_item_type_index' => 'index:invoice_id,item_type',
            ]],
            'payments' => ['payments', [
                'PRIMARY' => 'unique:id',
                'payments_receipt_number_unique' => 'unique:receipt_number',
                'payments_invoice_id_status_index' => 'index:invoice_id,status',
                'payments_status_created_at_index' => 'index:status,created_at',
                'payments_reviewed_by_reviewed_at_index' => 'index:reviewed_by,reviewed_at',
                'payments_submitted_by_foreign' => 'index:submitted_by',
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

    public function test_foreign_keys_are_all_restrict(): void
    {
        $actual = [];
        foreach (DB::select(
            "select k.TABLE_NAME as t, k.COLUMN_NAME as c, k.REFERENCED_TABLE_NAME as rt, r.DELETE_RULE as del
             from information_schema.KEY_COLUMN_USAGE k
             join information_schema.REFERENTIAL_CONSTRAINTS r
               on r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA and r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
             where k.TABLE_SCHEMA = database() and k.TABLE_NAME in ('invoices','meter_readings','invoice_items','payments')",
        ) as $row) {
            $actual[] = "{$row->t}.{$row->c} -> {$row->rt} {$row->del}";
        }
        sort($actual);

        $this->assertSame([
            'invoice_items.invoice_id -> invoices RESTRICT',
            'invoices.contract_id -> contracts RESTRICT',
            'invoices.related_invoice_id -> invoices RESTRICT',
            'meter_readings.contract_id -> contracts RESTRICT',
            'meter_readings.invoice_id -> invoices RESTRICT',
            'meter_readings.room_id -> rooms RESTRICT',
            'meter_readings.service_id -> services RESTRICT',
            'payments.invoice_id -> invoices RESTRICT',
            'payments.reviewed_by -> users RESTRICT',
            'payments.submitted_by -> users RESTRICT',
        ], $actual);
    }
}
