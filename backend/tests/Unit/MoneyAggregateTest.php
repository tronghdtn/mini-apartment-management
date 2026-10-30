<?php

namespace Tests\Unit;

use App\Support\Money;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class MoneyAggregateTest extends TestCase
{
    public function test_cross_invoice_totals_never_lose_integer_precision(): void
    {
        $this->assertSame('18014398509481982', Money::aggregate([Money::MAX_VND, Money::MAX_VND]));
        $this->assertSame('0', Money::aggregate([]));
    }

    public function test_invalid_amount_is_not_coerced_to_real_money(): void
    {
        foreach ([true, '100', 1.5, -1, Money::MAX_VND + 1] as $amount) {
            try {
                Money::aggregate([$amount]);
                $this->fail('Expected an invalid amount to be rejected.');
            } catch (InvalidArgumentException) {
                $this->assertTrue(true);
            }
        }
    }
}
