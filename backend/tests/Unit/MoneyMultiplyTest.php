<?php

namespace Tests\Unit;

use App\Support\Money;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class MoneyMultiplyTest extends TestCase
{
    public static function amounts(): array
    {
        return [
            [0, '999.99', 0], [3500000, '1.50', 5250000],
            [3500001, '1.50', 5250002], [1, '0.49', 0], [1, '0.50', 1],
            [9007199254740991, '1.00', 9007199254740991],
            [PHP_INT_MAX, '1', PHP_INT_MAX],
        ];
    }

    #[DataProvider('amounts')]
    public function test_exact_decimal_multiplication_and_half_up(int $amount, string $factor, int $expected): void
    {
        $this->assertSame($expected, Money::multiply($amount, $factor));
    }

    public static function invalidAmounts(): array
    {
        return [[-1, '1'], [1, '-1'], [1, '1e2'], [1, 'NaN'], [1, ''], [1, ' 1'], [PHP_INT_MAX, '2']];
    }

    #[DataProvider('invalidAmounts')]
    public function test_rejects_negative_malformed_and_overflowing_products(int $amount, string $factor): void
    {
        $this->expectException(InvalidArgumentException::class);
        Money::multiply($amount, $factor);
    }
}
