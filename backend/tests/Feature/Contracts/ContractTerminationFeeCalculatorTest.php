<?php

namespace Tests\Feature\Contracts;

use App\Models\Contract;
use App\Services\ContractTerminationFeeCalculator;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** No DB writes: exercise the independent fee calculation, not the unimplemented closure flow. */
class ContractTerminationFeeCalculatorTest extends TestCase
{
    private function contract(array $terms = []): Contract
    {
        return (new Contract)->forceFill([
            'start_date' => '2026-10-01', 'end_date' => '2027-09-30', 'monthly_rent' => 3500001,
            'early_termination_fee_type' => null, 'early_termination_fee_amount' => null,
            'early_termination_fee_multiplier' => null, 'early_termination_waiver_conditions' => null,
            ...$terms,
        ]);
    }

    public static function agreedFees(): array
    {
        return [
            'no fee agreed' => [['early_termination_fee_type' => 'none'], '2026-11-01', 0],
            'fixed' => [['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000], '2026-11-01', 2000000],
            'fixed explicit zero' => [['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 0], '2026-11-01', 0],
            'factor half up' => [['early_termination_fee_type' => 'rent_multiple', 'early_termination_fee_multiplier' => '1.50'], '2026-11-01', 5250002],
            'last occupied day handed back is early' => [['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000], '2027-09-30', 2000000],
            'on time is end date plus one' => [['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000], '2027-10-01', 0],
            'no early fee for overdue use' => [['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000], '2027-10-02', 0],
            'legacy no terms on time' => [[], '2027-10-01', 0],
        ];
    }

    #[DataProvider('agreedFees')]
    public function test_only_signed_terms_determine_fee(array $terms, string $handover, int $expected): void
    {
        config(['contract.default_early_termination_fee' => 99000000]);
        $this->assertSame($expected, app(ContractTerminationFeeCalculator::class)->calculate($this->contract($terms), $handover));
    }

    public function test_missing_terms_are_not_silently_treated_as_one_month_or_no_fee(): void
    {
        $this->expectException(ValidationException::class);
        app(ContractTerminationFeeCalculator::class)->calculate($this->contract(), '2026-11-01');
    }

    public function test_full_waiver_requires_matching_snapshot_confirmation_and_basis(): void
    {
        $contract = $this->contract([
            'early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000,
            'early_termination_waiver_conditions' => [['code' => 'AGREED', 'description' => 'Điều kiện đã ghi trong hợp đồng']],
            'early_termination_waiver_code' => 'AGREED', 'early_termination_waived_by' => 1,
            'early_termination_waived_at' => '2026-10-20 00:00:00', 'early_termination_waiver_note' => 'Căn cứ xác nhận minh họa trong test',
        ]);
        $this->assertSame(0, app(ContractTerminationFeeCalculator::class)->calculate($contract, '2026-11-01'));
        $this->assertSame(2000000, $contract->early_termination_fee_amount);
        $this->assertSame('AGREED', $contract->early_termination_waiver_conditions[0]['code']);
    }

    public static function invalidWaivers(): array
    {
        return [
            [['early_termination_waiver_code' => 'UNSIGNED']],
            [['early_termination_waived_by' => null]], [['early_termination_waived_at' => null]],
            [['early_termination_waiver_note' => '  ']], [['early_termination_waiver_conditions' => []]],
            [['early_termination_waiver_code' => null]],
        ];
    }

    #[DataProvider('invalidWaivers')]
    public function test_arbitrary_or_incomplete_waivers_do_not_suppress_a_fee(array $changes): void
    {
        $contract = $this->contract([
            'early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000,
            'early_termination_waiver_conditions' => [['code' => 'AGREED', 'description' => 'Điều kiện hợp lệ']],
            'early_termination_waiver_code' => 'AGREED', 'early_termination_waived_by' => 1,
            'early_termination_waived_at' => '2026-10-20 00:00:00', 'early_termination_waiver_note' => 'Có căn cứ', ...$changes,
        ]);
        $this->expectException(ValidationException::class);
        app(ContractTerminationFeeCalculator::class)->calculate($contract, '2026-11-01');
    }

    public static function invalidDates(): array
    {
        return [['2026-09-30'], ['2026-02-30'], ['2026-10-32'], ['2026-11-01T00:00:00Z'], ['invalid']];
    }

    #[DataProvider('invalidDates')]
    public function test_rejects_invalid_or_pre_start_handover_dates(string $handover): void
    {
        $this->expectException(ValidationException::class);
        app(ContractTerminationFeeCalculator::class)->calculate($this->contract(), $handover);
    }

    public function test_same_day_fee_is_zero_under_approved_p9_even_with_signed_fixed_fee(): void
    {
        $calculator = app(ContractTerminationFeeCalculator::class);
        $this->assertSame(0, $calculator->calculate($this->contract(), '2026-10-01'));
        $this->assertSame(0, $calculator->calculate($this->contract([
            'early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000,
        ]), '2026-10-01'));
    }

    public function test_unsafe_fee_amount_is_rejected_instead_of_rounded_by_json(): void
    {
        $contract = $this->contract(['monthly_rent' => 9007199254740991,
            'early_termination_fee_type' => 'rent_multiple', 'early_termination_fee_multiplier' => '2.00']);
        $this->expectException(ValidationException::class);
        app(ContractTerminationFeeCalculator::class)->calculate($contract, '2026-11-01');
    }
}
