<?php

namespace Tests\Feature\Contracts;

use App\Enums\ContractStatus;
use App\Enums\ServiceBillingType;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\MeterReading;
use App\Models\Service;
use App\Models\User;
use App\Services\InvoiceCalculationService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ActiveContractServicesTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
        // 17:30 UTC 31/10 = 00:30 ngày 01/11 giờ Việt Nam: tháng hiện tại là 11, áp dụng từ 01/12.
        Carbon::setTestNow('2026-10-31 17:30:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function login(UserRole $role = UserRole::Admin): User
    {
        $actor = User::factory()->role($role)->create(['password' => 'Active Services Test!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $actor->email, 'password' => 'Active Services Test!42'])->assertOk();

        return $actor;
    }

    /** @return array{0: Contract, 1: Service, 2: Service} */
    private function activeContract(string $start = '2026-10-01'): array
    {
        $contract = Contract::factory()->active()->create(['start_date' => $start, 'end_date' => '2027-09-30', 'monthly_rent' => 3000000]);
        $cleaning = Service::factory()->create(['billing_type' => ServiceBillingType::PerPerson, 'price' => 50000]);
        $wifi = Service::factory()->create(['billing_type' => ServiceBillingType::PerRoom, 'price' => 100000]);
        foreach ([['ELECTRICITY', 'kWh'], ['WATER', 'm3']] as [$code, $unit]) {
            $metered = Service::where('code', $code)->first() ?? Service::factory()->metered($code, $unit)->create();
            $contract->contractServices()->create(['service_id' => $metered->id, 'quantity' => 1, 'unit_price' => null, 'start_date' => $start]);
        }
        $contract->contractServices()->create(['service_id' => $cleaning->id, 'quantity' => 2, 'unit_price' => 40000, 'start_date' => $start]);

        return [$contract, $cleaning, $wifi];
    }

    private function change(Contract $contract, array $services, ?string $revision = null): TestResponse
    {
        $revision ??= $this->spa('GET', '/api/v1/contracts/'.$contract->id)->json('data.lifecycle_revision');

        return $this->spa('PUT', '/api/v1/contracts/'.$contract->id.'/services', ['services' => $services, 'expected_revision' => $revision]);
    }

    private function lines(Contract $contract): array
    {
        return $contract->contractServices()->orderBy('id')->get()
            ->map(fn ($line) => [$line->service_id, $line->quantity, $line->unit_price, $line->start_date->format('Y-m-d'), $line->end_date?->format('Y-m-d')])->all();
    }

    public function test_change_applies_from_next_month_keeps_snapshots_and_does_not_touch_issued_invoices(): void
    {
        $this->login();
        [$contract, $cleaning, $wifi] = $this->activeContract();
        $meteredLines = $contract->contractServices()->orderBy('id')->take(2)->get()->map->getRawOriginal()->all();
        $november = Invoice::factory()->issued()->create(['contract_id' => $contract->id, 'period' => '2026-11-01', 'total_amount' => 3080000]);
        $invoiceBefore = $november->fresh()->getRawOriginal();
        $cleaning->update(['price' => 99999]);

        $this->change($contract, [['service_id' => $cleaning->id, 'quantity' => 3], ['service_id' => $wifi->id, 'quantity' => 1]])->assertOk()
            ->assertJsonPath('data.status', 'active');
        $electricity = $meteredLines[0]['service_id'];
        $water = $meteredLines[1]['service_id'];
        $this->assertSame([
            [$electricity, '1.00', null, '2026-10-01', null],
            [$water, '1.00', null, '2026-10-01', null],
            [$cleaning->id, '2.00', 40000, '2026-10-01', '2026-11-30'],
            [$cleaning->id, '3.00', 40000, '2026-12-01', null],
            [$wifi->id, '1.00', 100000, '2026-12-01', null],
        ], $this->lines($contract));
        $this->assertSame($meteredLines, $contract->contractServices()->orderBy('id')->take(2)->get()->map->getRawOriginal()->all());
        $this->assertEquals($invoiceBefore, $november->fresh()->getRawOriginal());

        // Tính thử bằng bộ tính hóa đơn thật: tháng 11 theo dòng cũ, tháng 12 theo dòng mới.
        // Chỉ số kỳ trước dựng trong bộ nhớ (tiêu thụ 0) chỉ để thỏa điều kiện điện nước, không ghi DB.
        $subscriptions = $contract->fresh()->contractServices()->with('service')->get();
        $calculator = app(InvoiceCalculationService::class);
        $amounts = function (string $period) use ($calculator, $contract, $subscriptions, $electricity, $water) {
            $prior = Carbon::parse($period)->subMonth()->format('Y-m-d');
            $readings = collect([$electricity, $water])->map(fn (int $service) => MeterReading::factory()->make(['contract_id' => $contract->id,
                'room_id' => $contract->room_id, 'service_id' => $service, 'period' => $prior, 'reading_date' => $period, 'previous_reading' => '1.00',
                'current_reading' => '1.00', 'consumption' => '0.00', 'unit_price' => 3500, 'amount' => 0]));

            return collect($calculator->calculate($contract->fresh(), $period, $subscriptions, $readings)['items'])
                ->where('item_type', 'service')->map(fn ($item) => [$item['quantity'], $item['unit_price'], $item['amount']])->values()->all();
        };
        $this->assertSame([['2.00', 40000, 80000]], $amounts('2026-11-01'));
        $this->assertSame([['3.00', 40000, 120000], ['1.00', 100000, 100000]], $amounts('2026-12-01'));

        // Ngừng dịch vụ: đóng dòng cuối tháng 11; dòng tháng 12 chưa từng hiệu lực được sửa trực tiếp, không tạo lịch sử giả.
        $this->change($contract, [['service_id' => $cleaning->id, 'quantity' => 2]])->assertOk();
        $this->assertSame([
            [$electricity, '1.00', null, '2026-10-01', null],
            [$water, '1.00', null, '2026-10-01', null],
            [$cleaning->id, '2.00', 40000, '2026-10-01', '2026-11-30'],
            [$cleaning->id, '2.00', 40000, '2026-12-01', null],
        ], $this->lines($contract));
    }

    public function test_existing_invoice_for_the_effective_month_blocks_the_change_without_writing(): void
    {
        $this->login();
        [$contract, $cleaning] = $this->activeContract();
        Invoice::factory()->create(['contract_id' => $contract->id, 'period' => '2026-12-01']);
        $before = $this->lines($contract);
        $this->change($contract, [['service_id' => $cleaning->id, 'quantity' => 5]])->assertConflict()
            ->assertJsonPath('message', 'Đã có hóa đơn cho kỳ 12/2026 trở đi. Thay đổi dịch vụ không được làm thay đổi hóa đơn đã lập.');
        $this->assertSame($before, $this->lines($contract));
        DB::table('invoices')->where('contract_id', $contract->id)->update(['status' => 'cancelled', 'cancel_reason' => 'Kiểm thử']);
        $this->change($contract, [['service_id' => $cleaning->id, 'quantity' => 5]])->assertOk();
    }

    public function test_stale_or_missing_revision_and_repeated_submission_are_rejected(): void
    {
        $this->login();
        [$contract, $cleaning] = $this->activeContract();
        $revision = $this->spa('GET', '/api/v1/contracts/'.$contract->id)->json('data.lifecycle_revision');
        $this->spa('PUT', '/api/v1/contracts/'.$contract->id.'/services', ['services' => []])->assertUnprocessable()->assertJsonValidationErrors('expected_revision');
        $this->change($contract, [['service_id' => $cleaning->id, 'quantity' => 4]], $revision)->assertOk();
        $after = $this->lines($contract);
        $this->change($contract, [['service_id' => $cleaning->id, 'quantity' => 4]], $revision)->assertConflict();
        $this->assertSame($after, $this->lines($contract));
        $this->change($contract, [['service_id' => $cleaning->id, 'quantity' => 4]], str_repeat('g', 64))->assertUnprocessable();
    }

    public function test_service_rules_are_validated_before_any_write(): void
    {
        $this->login();
        [$contract, $cleaning, $wifi] = $this->activeContract();
        $inactive = Service::factory()->create(['status' => ServiceStatus::Inactive, 'price' => 1000]);
        $water = Service::where('code', 'WATER')->sole();
        $before = $this->lines($contract);
        foreach ([
            [['service_id' => $inactive->id, 'quantity' => 1]],
            [['service_id' => $water->id, 'quantity' => 1]],
            [['service_id' => $wifi->id, 'quantity' => 2]],
            [['service_id' => 99999999, 'quantity' => 1]],
            [['service_id' => $cleaning->id, 'quantity' => 0]],
            [['service_id' => $cleaning->id, 'quantity' => 2], ['service_id' => $cleaning->id, 'quantity' => 3]],
        ] as $services) {
            $this->change($contract, $services)->assertUnprocessable();
        }
        $this->assertSame($before, $this->lines($contract));
        // Dịch vụ đang dùng đã ngừng hoạt động: được giữ nguyên hoặc ngừng, không được đổi số lượng.
        $cleaning->update(['status' => ServiceStatus::Inactive]);
        $this->change($contract, [['service_id' => $cleaning->id, 'quantity' => 3]])->assertUnprocessable()->assertJsonValidationErrors('services.0.service_id');
        $this->change($contract, [['service_id' => $cleaning->id, 'quantity' => 2]])->assertOk();
        $this->assertSame($before, $this->lines($contract));
        $this->change($contract, [])->assertOk();
        $this->assertSame('2026-11-30', $contract->contractServices()->where('service_id', $cleaning->id)->sole()->end_date->format('Y-m-d'));
    }

    public function test_handover_terminated_and_future_start_contracts(): void
    {
        $this->login();
        [$contract, $cleaning] = $this->activeContract();
        $contract->forceFill(['actual_end_date' => '2026-11-20'])->save();
        $this->change($contract, [])->assertConflict();
        $terminated = Contract::factory()->terminated()->create();
        $this->spa('PUT', '/api/v1/contracts/'.$terminated->id.'/services', ['services' => [], 'expected_revision' => str_repeat('a', 64)])->assertConflict();

        // Hợp đồng bắt đầu sau 01/12: áp dụng từ ngày bắt đầu, sửa trực tiếp dòng chưa từng hiệu lực.
        [$future, $futureCleaning] = $this->activeContract('2027-01-10');
        $this->change($future, [['service_id' => $futureCleaning->id, 'quantity' => 1]])->assertOk();
        $this->assertSame([[$futureCleaning->id, '1.00', 40000, '2027-01-10', null]],
            array_values(array_filter($this->lines($future), fn ($line) => $line[0] === $futureCleaning->id)));
    }

    public function test_only_active_admin_can_change_services(): void
    {
        [$contract] = $this->activeContract();
        $this->spa('PUT', '/api/v1/contracts/'.$contract->id.'/services', ['services' => [], 'expected_revision' => str_repeat('a', 64)])->assertUnauthorized();
        foreach ([UserRole::Resident, UserRole::Technician] as $role) {
            $this->login($role);
            $this->spa('PUT', '/api/v1/contracts/'.$contract->id.'/services', ['services' => [], 'expected_revision' => str_repeat('a', 64)])->assertForbidden();
            $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
        }
        $this->assertSame(ContractStatus::Active, $contract->fresh()->status);
    }
}
