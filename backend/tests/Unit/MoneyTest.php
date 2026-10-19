<?php

namespace Tests\Unit;

use App\Support\Money;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    /** @return array<string, array{string, int}> */
    public static function roundingCases(): array
    {
        return [
            'dưới .5' => ['1.49', 1],
            'đúng .5' => ['2.5', 3],
            'trên .5' => ['2.51', 3],
            'nguyên' => ['100000', 100000],
            'âm đúng .5 (ra xa 0)' => ['-2.5', -3],
            'âm dưới .5' => ['-2.4', -2],
            'âm làm tròn về 0' => ['-0.4', 0],
            'sát .5 phía dưới' => ['0.4999999999', 0],
        ];
    }

    #[DataProvider('roundingCases')]
    public function test_round_half_up(string $value, int $expected): void
    {
        $this->assertSame($expected, Money::roundHalfUp($value));
    }

    public function test_prorate_split_month_has_no_double_charge(): void
    {
        // DB-06: thuê 01–15 và 16–31 tháng 31 ngày, Internet 100.000đ
        $first = Money::prorate(100000, '1', 15, 31);
        $second = Money::prorate(100000, '1', 16, 31);

        $this->assertSame(48387, $first);
        $this->assertSame(51613, $second);
        $this->assertSame(100000, $first + $second);
    }

    public function test_same_day_handover_counts_each_day_once(): void
    {
        // DB-30 / DB-D32: bàn giao 15/10, A tính 01–14 (14 ngày, loại trừ ngày bàn giao), B tính 15–31 (17 ngày)
        $this->assertSame(1400000, Money::prorate(3100000, '1', 14, 31));
        $this->assertSame(1700000, Money::prorate(3100000, '1', 17, 31));

        $internetA = Money::prorate(100000, '1', 14, 31);
        $internetB = Money::prorate(100000, '1', 17, 31);
        $this->assertSame(45161, $internetA);
        $this->assertSame(54839, $internetB);
        $this->assertSame(100000, $internetA + $internetB);
    }

    public function test_prorate_full_month_and_month_lengths(): void
    {
        $this->assertSame(100000, Money::prorate(100000, '1', 31, 31));
        $this->assertSame(100000, Money::prorate(100000, '1', 28, 28));
        $this->assertSame(50000, Money::prorate(100000, '1', 14, 28));
        $this->assertSame(51724, Money::prorate(100000, '1', 15, 29)); // 51724,137…
        $this->assertSame(150000, Money::prorate(50000, '3', 30, 30)); // per_person × 3
        $this->assertSame(0, Money::prorate(100000, '1', 0, 30));
    }

    public function test_meter_amount_uses_decimal_consumption(): void
    {
        $this->assertSame(43225, Money::meterAmount('12.35', 3500));
        $this->assertSame(33, Money::meterAmount('0.01', 3333));   // 33,33
        $this->assertSame(500, Money::meterAmount('0.15', 3333));  // 499,95 → 500
        $this->assertSame(0, Money::meterAmount('0.00', 3500));
    }

    public function test_rejects_float_like_or_invalid_input(): void
    {
        foreach (['1e3', '12,5', '', 'abc', '.5'] as $invalid) {
            try {
                Money::roundHalfUp($invalid);
                $this->fail("Phải từ chối [{$invalid}]");
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_rejects_out_of_range_arguments(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::prorate(100000, '1', 32, 31);
    }

    public function test_rejects_negative_consumption(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::meterAmount('-1.00', 3500);
    }
}
