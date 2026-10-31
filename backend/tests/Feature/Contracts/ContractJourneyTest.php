<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\InteractsWithContractSettlement;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

/** Cross-module HTTP-kernel journey; no factory creates a contract, reading, invoice or payment. */
class ContractJourneyTest extends TestCase
{
    use InteractsWithContractSettlement, InteractsWithSpaCookies;

    private const PASSWORD = 'Journey test only!42';

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-10-31 08:00:00 UTC');
        $this->prepareSettlementSchema();
        DB::beginTransaction();
        Storage::fake('private');
        $this->initializeSpaClient();
        $this->admin = User::factory()->role(UserRole::Admin)->create(['password' => self::PASSWORD]);
        $this->login($this->admin);
    }

    protected function tearDown(): void
    {
        try {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            $this->restoreSettlementSchema();
        } finally {
            CarbonImmutable::setTestNow();
            parent::tearDown();
        }
    }

    public static function settlements(): array
    {
        return [
            'paid monthly invoices, rejected proof, refund still owed' => [3235000, false, '0', 835000],
            'partial monthly payment, confirmed proof, debt remains' => [600000, true, '1750000', 0],
        ];
    }

    #[DataProvider('settlements')]
    public function test_contract_lifecycle_preserves_money_and_history_when_room_is_relet(int $octoberPaid, bool $confirmProof, string $remainingDebt, int $refund): void
    {
        // Factories supply prerequisites only; all business transitions below use real endpoints.
        $room = Room::factory()->create();
        $tenant = User::factory()->role(UserRole::User)->create(['password' => self::PASSWORD]);
        $power = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $water = Service::factory()->metered('WATER', 'm3')->create();
        foreach ([[$power, 3500], [$water, 15000]] as [$service, $price]) {
            $this->spa('POST', '/api/v1/utility-prices', ['building_id' => $room->building_id,
                'service_id' => $service->id, 'effective_from' => '2026-09-01', 'unit_price' => $price])->assertCreated();
        }

        $contract = $this->createDraft($room, $tenant, '2026-09-01', 1000000);
        $url = '/api/v1/contracts/'.$contract['id'];
        $this->spa('POST', "$url/activate", $this->activation($contract, '100.00', '10.00'))->assertConflict();
        $contract = $this->spa('POST', "$url/deposit", ['confirmed' => true, 'expected_amount' => 1000000,
            'expected_revision' => $contract['lifecycle_revision']])->assertOk()->json('data');
        $contract = $this->spa('POST', "$url/activate", $this->activation($contract, '100.00', '10.00'))
            ->assertOk()->assertJsonPath('data.status', 'active')->assertJsonPath('data.tenant.role', 'resident')->json('data');
        $this->assertSame('occupied', $room->fresh()->status->value);
        $this->assertDatabaseCount('payments', 0); // Receiving a deposit is not invoice revenue.
        $this->assertDatabaseCount('meter_readings', 0);

        $september = $this->issueMonthly($contract['id'], '2026-09-01');
        $this->assertSame(3100000, $september['total_amount']);
        $this->payCash($september, 3100000);
        $this->spa('POST', '/api/v1/meter-readings', ['readings' => array_map(fn ($service, $reading) => [
            'room_id' => $room->id, 'service_id' => $service->id, 'period' => '2026-09-01',
            'reading_date' => '2026-10-01', 'current_reading' => $reading,
        ], [$power, $water], ['130.00', '12.00'])])->assertCreated();
        $october = $this->issueMonthly($contract['id'], '2026-10-01');
        $this->assertSame(3235000, $october['total_amount']); // Rent + September electricity/water.
        $this->payCash($october, $octoberPaid);

        $contract = $this->spa('GET', $url)->assertOk()->json('data');
        $contract = $this->spa('POST', "$url/inspection", ['inspection_result' => 'no_damage',
            'expected_revision' => $contract['lifecycle_revision']])->assertOk()->json('data');
        $handover = ['actual_end_date' => '2026-10-30',
            'electricity_reading' => '200.00', 'water_reading' => '20.00',
            'expected_revision' => $contract['lifecycle_revision']];
        $this->spa('POST', "$url/final-invoice", $handover)->assertUnprocessable()->assertJsonValidationErrors('closure_note');
        $final = $this->spa('POST', "$url/final-invoice", [...$handover,
            'closure_note' => 'Trả phòng trước hạn theo thỏa thuận kiểm thử.'])->assertCreated()->json('data');
        // 245,000 electricity + 120,000 water - 200,000 unused October rent; no double rent.
        $this->assertSame(165000, $final['total_amount']);
        $final = $this->spa('POST', '/api/v1/invoices/'.$final['id'].'/issue', ['expected_revision' => $final['revision']])
            ->assertOk()->json('data');
        $items = DB::table('invoice_items')->orderBy('id')->get()->toJson();

        $this->login($tenant);
        $this->spa('GET', '/api/v1/resident/contracts/'.$contract['id'])->assertOk();
        $this->spa('GET', "$url/settlement-preview")->assertForbidden();
        $proof = UploadedFile::fake()->createWithContent('proof.png', base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
        $pending = $this->spa('POST', '/api/v1/invoices/'.$final['id'].'/payments', ['amount' => 50000], files: ['proof' => $proof])
            ->assertCreated()->assertJsonPath('data.status', 'pending')->json('data');
        $this->spa('GET', '/api/v1/invoices/'.$final['id'])->assertOk()->assertJsonPath('data.paid_amount', 0);

        $this->login($this->admin);
        $pending = $this->spa('GET', '/api/v1/payments/'.$pending['id'])->assertOk()->json('data');
        $blocked = $this->spa('GET', "$url/settlement-preview")->assertOk()
            ->assertJsonPath('data.can_terminate', false)->assertJsonPath('data.pending_payment_count', 1)->json('data');
        $this->close($url, $blocked)->assertConflict();
        $review = $confirmProof
            ? ['expected_amount' => 50000, 'confirmed_received' => true]
            : ['reject_reason' => 'Minh chứng không khớp trong kiểm thử.'];
        $this->spa('POST', '/api/v1/payments/'.$pending['id'].'/'.($confirmProof ? 'confirm' : 'reject'),
            ['expected_revision' => $pending['revision'], ...$review])->assertOk();
        $this->close($url, $blocked)->assertConflict(); // Review invalidates the earlier preview.
        $preview = $this->spa('GET', "$url/settlement-preview")->assertOk()->assertJsonPath('data.can_terminate', true)->json('data');
        $this->close($url, $preview)->assertOk()->assertJsonPath('data.status', 'terminated')
            ->assertJsonPath('data.outstanding_amount', $remainingDebt)->assertJsonPath('data.deposit_refund_amount', $refund)
            ->assertJsonPath('data.refund_recording', 'unpaid_obligation');
        $this->assertSame('available', $room->fresh()->status->value);
        $this->assertSame($items, DB::table('invoice_items')->orderBy('id')->get()->toJson());
        $this->assertSame('resident', $tenant->fresh()->role->value);
        $this->spa('GET', '/api/v1/debts')->assertOk()->assertJsonCount($remainingDebt === '0' ? 0 : 1, 'data')
            ->assertJsonPath('summary.total_outstanding', $remainingDebt);

        // The handover meter is the next tenant's actual starting point, never a guessed zero.
        $nextTenant = User::factory()->role(UserRole::User)->create(['password' => self::PASSWORD]);
        $next = $this->createDraft($room, $nextTenant, '2026-10-30', 0);
        $this->spa('POST', '/api/v1/contracts/'.$next['id'].'/activate', $this->activation($next, '200.00', '20.00'))
            ->assertOk()->assertJsonPath('data.status', 'active');
        $paymentCount = DB::table('payments')->count();
        $this->close($url, $preview)->assertOk()->assertJsonPath('data.already_terminated', true)->assertJsonPath('data.room_status', 'occupied');
        $this->assertSame($paymentCount, DB::table('payments')->count());
        $this->assertSame('active', Contract::findOrFail($next['id'])->status->value);
        foreach ([$september['id'], $october['id'], $final['id']] as $id) {
            $invoice = $this->spa('GET', '/api/v1/invoices/'.$id)->assertOk()->json('data');
            $this->spa('POST', '/api/v1/invoices/'.$id.'/cancel', ['expected_revision' => $invoice['revision'],
                'reason' => 'Không được hủy sau thanh lý.'])->assertConflict();
        }

        $this->login($tenant);
        $this->spa('GET', '/api/v1/resident/contracts/'.$contract['id'])->assertOk()->assertJsonPath('data.status', 'terminated');
        // Owner-scoped lookup deliberately returns 404, so another tenant's contract is not disclosed.
        $this->spa('GET', '/api/v1/resident/contracts/'.$next['id'])->assertNotFound();
        $this->spa('GET', '/api/v1/invoices/'.$final['id'])->assertOk()->assertJsonMissingPath('data.contract_status');
        $this->spa('GET', '/api/v1/debts')->assertForbidden();

        if ($remainingDebt !== '0') {
            $proof = UploadedFile::fake()->createWithContent('old-debt.png', base64_decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
            $oldDebt = $this->spa('POST', '/api/v1/invoices/'.$october['id'].'/payments', ['amount' => 100000], files: ['proof' => $proof])
                ->assertCreated()->assertJsonPath('data.status', 'pending')->json('data');
            $this->login($this->admin);
            $oldDebt = $this->spa('GET', '/api/v1/payments/'.$oldDebt['id'])->assertOk()->json('data');
            $this->spa('POST', '/api/v1/payments/'.$oldDebt['id'].'/confirm', ['expected_revision' => $oldDebt['revision'],
                'expected_amount' => 100000, 'confirmed_received' => true])->assertOk();
            $this->spa('GET', '/api/v1/debts')->assertOk()->assertJsonPath('summary.total_outstanding', '1650000');
            $this->assertSame('occupied', $room->fresh()->status->value);
            $this->assertSame('terminated', Contract::findOrFail($contract['id'])->status->value);
            $this->assertSame('active', Contract::findOrFail($next['id'])->status->value);
        }
    }

    private function login(User $user): void
    {
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => self::PASSWORD])->assertOk();
    }

    private function createDraft(Room $room, User $tenant, string $start, int $deposit): array
    {
        $draft = $this->spa('POST', '/api/v1/contracts', ['room_id' => $room->id, 'user_id' => $tenant->id,
            'start_date' => $start, 'end_date' => '2027-09-01', 'monthly_rent' => 3100000,
            'deposit_amount' => $deposit, 'occupant_count' => 1])->assertCreated()->json('data');

        return $this->spa('PUT', '/api/v1/contracts/'.$draft['id'].'/terms', ['early_termination_fee_type' => 'none'])
            ->assertOk()->json('data');
    }

    private function activation(array $contract, string $power, string $water): array
    {
        return ['expected_revision' => $contract['lifecycle_revision'], 'initial_electricity_reading' => $power,
            'initial_water_reading' => $water, 'meter_gap_confirmed' => false];
    }

    private function issueMonthly(int $contractId, string $period): array
    {
        $draft = $this->spa('POST', '/api/v1/invoices', ['contract_id' => $contractId, 'period' => $period])
            ->assertCreated()->json('data');

        return $this->spa('POST', '/api/v1/invoices/'.$draft['id'].'/issue', ['expected_revision' => $draft['revision']])
            ->assertOk()->json('data');
    }

    private function payCash(array $invoice, int $amount): void
    {
        $this->spa('POST', '/api/v1/invoices/'.$invoice['id'].'/payments', ['amount' => $amount,
            'method' => 'cash', 'confirmed_received' => true, 'expected_revision' => $invoice['revision']])->assertCreated();
    }

    private function close(string $url, array $preview): TestResponse
    {
        return $this->spa('POST', "$url/terminate", ['confirmed' => true, 'expected_revision' => $preview['revision']]);
    }
}
