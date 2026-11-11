<?php

namespace Tests\Support;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Service;
use App\Models\User;
use App\Services\ContractFinalInvoiceService;
use App\Services\ContractInspectionService;
use App\Services\ContractService;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

trait InteractsWithContractSettlement
{
    protected array $settlementSchema = [];

    protected function prepareSettlementSchema(): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasColumn('utility_prices', 'building_id'));
        $this->assertSame(0, DB::table('utility_prices')->count());
        foreach (['2026_10_27_000002_scope_utility_prices_to_buildings.php', '2026_10_28_000001_scope_final_meter_readings_to_contracts.php',
            '2026_10_14_400019_create_attachments_table.php', '2026_10_30_400021_add_contract_inspection_fields.php',
            '2026_10_14_400020_create_notifications_table.php'] as $file) {
            $migration = require database_path('migrations/pending/'.$file);
            $migration->up();
            $this->settlementSchema[] = $migration;
        }
    }

    protected function restoreSettlementSchema(): void
    {
        foreach (array_reverse($this->settlementSchema) as $migration) {
            $migration->down();
        }
    }

    /** Real services build/issue the final; factories create only isolated test identities/history. */
    protected function settlementFixture(User $admin, int $deposit = 3000000, string $history = '', bool $sameDay = false, bool $damaged = false): array
    {
        $owner = User::factory()->role(UserRole::Resident)->create();
        $start = $sameDay ? '2026-10-30' : ($history === 'arrears' ? '2026-08-01' : '2026-10-01');
        $contract = Contract::factory()->active()->create(['user_id' => $owner->id, 'start_date' => $start, 'end_date' => '2026-11-01',
            'monthly_rent' => 3100000, 'deposit_amount' => $deposit, 'deposit_status' => $deposit > 0 ? 'held' : 'unpaid',
            'deposit_paid_at' => $deposit > 0 ? now() : null, 'initial_electricity_reading' => '100.00', 'initial_water_reading' => '10.00',
            'early_termination_fee_type' => $damaged ? 'fixed' : 'none', 'early_termination_fee_amount' => $damaged ? 100000 : null]);
        $contract->room->forceFill(['status' => 'occupied'])->save();
        foreach ([['ELECTRICITY', 'kWh', '100.00', 3500], ['WATER', 'm3', '10.00', 15000]] as [$code, $unit, $reading, $price]) {
            $service = Service::where('code', $code)->first() ?? Service::factory()->metered($code, $unit)->create();
            $contract->contractServices()->create(['service_id' => $service->id, 'quantity' => '1.00', 'unit_price' => null, 'start_date' => $start]);
            DB::table('utility_prices')->insert(['building_id' => $contract->room->building_id, 'service_id' => $service->id,
                'effective_from' => substr($start, 0, 8).'01', 'unit_price' => $price]);
            if ($history === 'arrears') {
                foreach (['2026-08-01' => '2026-09-01', '2026-09-01' => '2026-10-01'] as $period => $date) {
                    DB::table('meter_readings')->insert(['contract_id' => $contract->id, 'room_id' => $contract->room_id,
                        'service_id' => $service->id, 'kind' => 'periodic', 'period' => $period, 'reading_date' => $date,
                        'previous_reading' => $reading, 'current_reading' => $reading, 'consumption' => '0.00',
                        'unit_price' => $price, 'amount' => 0, 'created_at' => now(), 'updated_at' => now()]);
                }
            }
        }
        $invoices = app(InvoiceService::class);
        $monthly = [];
        foreach ($history === 'arrears' ? ['2026-08-01', '2026-09-01'] : ($history === 'prepaid' ? ['2026-10-01'] : []) as $period) {
            $draft = $invoices->createMonthly(['contract_id' => $contract->id, 'period' => $period]);
            $issued = $invoices->issue($draft, $draft->revision());
            // A persisted historical deadline, never an API for changing issued invoices.
            DB::table('invoices')->where('id', $issued->id)->update(['due_date' => substr($period, 0, 8).'10']);
            $issued = $invoices->find($issued->id);
            if ($history === 'prepaid' || $monthly === []) {
                app(PaymentService::class)->store($issued, $admin, ['method' => 'cash', 'amount' => $history === 'prepaid' ? 3100000 : 600000,
                    'confirmed_received' => true, 'expected_revision' => $issued->revision()]);
            }
            $monthly[] = $issued->id;
        }
        $contracts = app(ContractService::class);
        $contract = $contracts->find($contract->id);
        $contract = app(ContractInspectionService::class)->record($contract, $admin, ['inspection_result' => $damaged ? 'damaged' : 'no_damage',
            'inspection_note' => $damaged ? 'Hư hỏng thử nghiệm.' : null, 'expected_revision' => $contract->lifecycleRevision()], []);
        $data = ['actual_end_date' => '2026-10-30', 'closure_note' => 'Chỉ sử dụng trong DB test.',
            'electricity_reading' => '100.00', 'water_reading' => '10.00', 'expected_revision' => $contract->lifecycleRevision()];
        if ($damaged) {
            $data['damages'] = [['description' => 'Hạng mục thử nghiệm', 'reason' => 'Hư hỏng do người thuê', 'basis' => 'Báo giá thử nghiệm', 'amount' => 100000]];
            $data['damage_photos'] = [[UploadedFile::fake()->createWithContent('damage.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='))]];
        }
        $draft = app(ContractFinalInvoiceService::class)->create($contract, $admin, $data);
        $final = $invoices->issue($draft, $draft->revision());

        return [$contracts->find($contract->id), $final, $owner, $monthly];
    }
}
