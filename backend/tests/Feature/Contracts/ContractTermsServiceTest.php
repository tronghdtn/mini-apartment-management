<?php

namespace Tests\Feature\Contracts;

use App\Enums\ContractStatus;
use App\Enums\EarlyTerminationFeeType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Contract;
use App\Models\User;
use App\Services\ContractTermsService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ContractTermsServiceTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->role(UserRole::Admin)->create();
    }

    public function test_explicit_terms_and_waiver_conditions_are_saved_as_contract_snapshots(): void
    {
        $contract = Contract::factory()->create();
        $before = $contract->fresh()->getRawOriginal();
        $terms = [
            'early_termination_fee_type' => 'rent_multiple', 'early_termination_fee_multiplier' => '1.50',
            'early_termination_waiver_conditions' => [['code' => 'NOTICE', 'description' => 'Điều kiện thỏa thuận khi ký']],
        ];
        $saved = app(ContractTermsService::class)->updateDraft($contract, $this->admin(), $terms);
        $this->assertSame(EarlyTerminationFeeType::RentMultiple, $saved->early_termination_fee_type);
        $this->assertSame('1.50', $saved->early_termination_fee_multiplier);
        $this->assertSame($terms['early_termination_waiver_conditions'], $saved->early_termination_waiver_conditions);
        foreach (['room_id', 'user_id', 'monthly_rent', 'deposit_amount', 'deposit_status', 'start_date', 'end_date', 'status'] as $field) {
            $this->assertSame($before[$field], $saved->getRawOriginal($field));
        }
        config(['contract.default_early_termination_fee' => 99000000]);
        $this->assertSame('1.50', $saved->fresh()->early_termination_fee_multiplier);
        $this->assertNull($saved->early_termination_waived_by);
        $this->assertNull($saved->early_termination_waiver_code);
    }

    public function test_none_is_explicit_and_incomplete_draft_terms_stay_null_without_default_fee(): void
    {
        $contract = Contract::factory()->create();
        $this->assertNull($contract->fresh()->early_termination_fee_type);
        $actor = $this->admin();
        $service = app(ContractTermsService::class);
        $saved = $service->updateDraft($contract, $actor, ['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000]);
        $this->assertSame(2000000, $saved->early_termination_fee_amount);
        $saved = $service->updateDraft($saved, $actor, ['early_termination_fee_type' => 'none']);
        $this->assertSame(EarlyTerminationFeeType::None, $saved->early_termination_fee_type);
        $this->assertNull($saved->early_termination_fee_amount);
        $saved = $service->updateDraft($saved, $actor, ['early_termination_fee_type' => null]);
        $this->assertNull($saved->early_termination_fee_type);
        $this->assertNull($saved->early_termination_fee_amount);
        $this->assertNull($saved->early_termination_fee_multiplier);
    }

    public static function invalidTerms(): array
    {
        return [
            'missing explicit type' => [[]],
            'unknown type' => [['early_termination_fee_type' => 'one_month']],
            'fixed amount required' => [['early_termination_fee_type' => 'fixed']],
            'negative amount' => [['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => -1]],
            'fraction amount' => [['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => '1.50']],
            'boolean amount' => [['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => true]],
            'unsafe amount' => [['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => '9007199254740992']],
            'irrelevant amount' => [['early_termination_fee_type' => 'none', 'early_termination_fee_amount' => 1]],
            'zero multiplier' => [['early_termination_fee_type' => 'rent_multiple', 'early_termination_fee_multiplier' => '0.00']],
            'multiplier too high' => [['early_termination_fee_type' => 'rent_multiple', 'early_termination_fee_multiplier' => '1000.00']],
            'multiplier too precise' => [['early_termination_fee_type' => 'rent_multiple', 'early_termination_fee_multiplier' => '1.001']],
            'float multiplier' => [['early_termination_fee_type' => 'rent_multiple', 'early_termination_fee_multiplier' => 1.5]],
            'duplicate waiver code' => [['early_termination_fee_type' => 'none', 'early_termination_waiver_conditions' => [['code' => 'A', 'description' => 'Một'], ['code' => 'A', 'description' => 'Hai']]]],
            'blank waiver condition' => [['early_termination_fee_type' => 'none', 'early_termination_waiver_conditions' => [['code' => 'A', 'description' => '  ']]]],
            'waiver code too long' => [['early_termination_fee_type' => 'none', 'early_termination_waiver_conditions' => [['code' => 'A'.str_repeat('B', 50), 'description' => 'Một']]]],
            'extra nested control' => [['early_termination_fee_type' => 'none', 'early_termination_waiver_conditions' => [['code' => 'A', 'description' => 'Một', 'waived_by' => 1]]]],
            'forged confirmation' => [['early_termination_fee_type' => 'none', 'early_termination_waived_by' => 1]],
            'forged waiver' => [['early_termination_fee_type' => 'none', 'early_termination_waiver_code' => 'A']],
            'status mutation' => [['early_termination_fee_type' => 'none', 'status' => 'active']],
        ];
    }

    #[DataProvider('invalidTerms')]
    public function test_invalid_terms_never_partially_change_the_contract(array $terms): void
    {
        $contract = Contract::factory()->create();
        $before = $contract->fresh()->getRawOriginal();
        try {
            app(ContractTermsService::class)->updateDraft($contract, $this->admin(), $terms);
            $this->fail('Điều khoản sai phải bị từ chối.');
        } catch (ValidationException $exception) {
            $this->assertNotEmpty($exception->errors());
            $this->assertSame($before, $contract->fresh()->getRawOriginal());
        }
    }

    public static function blockedActors(): array
    {
        return [['user', 'active'], ['resident', 'active'], ['technician', 'active'], ['guard', 'active'], ['admin', 'locked']];
    }

    #[DataProvider('blockedActors')]
    public function test_service_uses_existing_policy_even_without_an_http_route(string $role, string $status): void
    {
        $actor = User::factory()->role(UserRole::from($role))->create(['status' => UserStatus::from($status)]);
        $this->expectException(AuthorizationException::class);
        app(ContractTermsService::class)->updateDraft(Contract::factory()->create(), $actor, ['early_termination_fee_type' => 'none']);
    }

    public function test_rechecks_status_under_lock_and_never_rewrites_an_activated_snapshot(): void
    {
        $contract = Contract::factory()->create();
        $actor = $this->admin();
        $saved = app(ContractTermsService::class)->updateDraft($contract, $actor, ['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000]);
        DB::table('contracts')->where('id', $saved->id)->update(['status' => ContractStatus::Active->value]);
        try {
            app(ContractTermsService::class)->updateDraft($saved, $actor, ['early_termination_fee_type' => 'none']);
            $this->fail('Không được sửa snapshot sau kích hoạt.');
        } catch (HttpException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
            $this->assertSame(2000000, $saved->fresh()->early_termination_fee_amount);
            $this->assertSame(EarlyTerminationFeeType::Fixed, $saved->fresh()->early_termination_fee_type);
        }
    }

    public function test_pending_dev_schema_is_reported_as_unavailable_without_writing(): void
    {
        $contract = Contract::factory()->create();
        $actor = $this->admin();
        Schema::shouldReceive('hasColumns')->with('contracts', ContractTermsService::SNAPSHOT_FIELDS)->andReturn(false);
        try {
            app(ContractTermsService::class)->updateDraft($contract, $actor, ['early_termination_fee_type' => 'none']);
            $this->fail('Phải chặn khi ALTER chưa được áp dụng.');
        } catch (HttpException $exception) {
            $this->assertSame(503, $exception->getStatusCode());
            $this->assertNull($contract->fresh()->early_termination_fee_type);
        }
    }

    public function test_database_failure_rolls_back_and_reports_no_signed_condition_text_or_bindings(): void
    {
        $contract = Contract::factory()->create();
        $actor = $this->admin();
        $before = $contract->fresh()->getRawOriginal();
        Exceptions::fake();
        $event = 'eloquent.updating: '.Contract::class;
        Event::listen($event, function (): never {
            throw new QueryException(self::TEST_CONNECTION, 'UPDATE contracts SET note = ?', ['Private test condition'], new PDOException('Synthetic SQL failure'));
        });
        try {
            app(ContractTermsService::class)->updateDraft($contract, $actor, ['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000]);
            $this->fail('Lỗi DB phải được trả an toàn.');
        } catch (HttpException $exception) {
            $this->assertSame(500, $exception->getStatusCode());
            $this->assertSame($before, $contract->fresh()->getRawOriginal());
            Exceptions::assertReported(fn (RuntimeException $reported): bool => $reported->getMessage() === 'Lưu điều khoản hợp đồng thất bại do lỗi CSDL.' && $reported->getPrevious() === null);
            Exceptions::assertNotReported(QueryException::class);
        } finally {
            Event::forget($event);
        }
    }

    public static function deposits(): array
    {
        return [
            'no deposit needs no receipt' => [0, 'unpaid', null, true],
            'positive amount actually received' => [2000000, 'held', '2026-10-20 00:00:00', true],
            'unpaid' => [2000000, 'unpaid', null, false],
            'held without receipt date' => [2000000, 'held', null, false],
            'date alone is not held' => [2000000, 'unpaid', '2026-10-20 00:00:00', false],
            'settled not available as held' => [2000000, 'settled', '2026-10-20 00:00:00', false],
        ];
    }

    #[DataProvider('deposits')]
    public function test_signed_terms_and_receipt_gate_follow_q15_without_creating_revenue(int $amount, string $status, ?string $date, bool $allowed): void
    {
        $contract = Contract::factory()->create(['deposit_amount' => $amount, 'deposit_status' => $status,
            'deposit_paid_at' => $date, 'early_termination_fee_type' => 'none']);
        $before = $contract->fresh()->getRawOriginal();
        $invoiceCount = DB::table('invoices')->count();
        $paymentCount = DB::table('payments')->count();
        try {
            app(ContractTermsService::class)->assertSignedTermsAndDeposit($contract);
            $this->assertTrue($allowed);
        } catch (HttpException $exception) {
            $this->assertFalse($allowed);
            $this->assertSame(409, $exception->getStatusCode());
        }
        $this->assertSame($before, $contract->fresh()->getRawOriginal());
        $this->assertSame($invoiceCount, DB::table('invoices')->count());
        $this->assertSame($paymentCount, DB::table('payments')->count());
    }

    public function test_terms_not_agreed_cannot_pass_the_activation_prerequisite_even_with_zero_deposit(): void
    {
        $contract = Contract::factory()->create(['deposit_amount' => 0]);
        $this->expectException(ValidationException::class);
        app(ContractTermsService::class)->assertSignedTermsAndDeposit($contract);
    }

    public function test_empty_draft_selection_is_null_instead_of_an_invalid_enum_or_an_implicit_fee(): void
    {
        $contract = Contract::factory()->create();
        $actor = $this->admin();
        foreach (['', '  '] as $type) {
            $saved = app(ContractTermsService::class)->updateDraft($contract, $actor, ['early_termination_fee_type' => $type]);
            $this->assertNull($saved->early_termination_fee_type);
            $this->assertNull($saved->early_termination_fee_amount);
            $this->assertNull($saved->early_termination_fee_multiplier);
        }
    }
}
