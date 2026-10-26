<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Tính tiền VND bằng BCMath (không dùng float).
 *
 * Tiền là số nguyên đồng; đại lượng có phần thập phân (số lượng, chỉ số) truyền vào dạng chuỗi,
 * đúng như cast `decimal:2` của Eloquent trả về. Làm tròn HALF_UP (0,5 làm tròn ra xa số 0)
 * đến đồng trên từng dòng — xem docs/09_DATABASE_DESIGN.md §1 và §5.
 */
final class Money
{
    /** Số chữ số thập phân giữ lại ở bước trung gian; cắt bớt ở đây không làm đổi kết quả làm tròn. */
    private const SCALE = 10;

    /** Làm tròn HALF_UP một giá trị thập phân về số nguyên đồng. */
    public static function roundHalfUp(string $value): int
    {
        self::assertDecimal($value);

        $negative = str_starts_with($value, '-');
        $absolute = ltrim($value, '-');
        $rounded = (int) bcadd($absolute, '0.5', 0);

        return $negative && $rounded !== 0 ? -$rounded : $rounded;
    }

    /**
     * Tiền một dòng dịch vụ định kỳ có phân bổ theo ngày:
     * round_half_up(unit_price × quantity × active_days / days_in_month).
     */
    public static function prorate(int $unitPrice, string $quantity, int $activeDays, int $daysInMonth): int
    {
        self::assertNonNegative($unitPrice, 'unitPrice');
        self::assertDecimal($quantity);

        if (str_starts_with($quantity, '-')) {
            throw new InvalidArgumentException('Số lượng không được âm.');
        }

        if ($daysInMonth < 28 || $daysInMonth > 31) {
            throw new InvalidArgumentException("daysInMonth phải trong khoảng 28..31, nhận {$daysInMonth}.");
        }

        if ($activeDays < 0 || $activeDays > $daysInMonth) {
            throw new InvalidArgumentException("activeDays phải trong khoảng 0..{$daysInMonth}, nhận {$activeDays}.");
        }

        $total = bcmul(bcmul((string) $unitPrice, $quantity, self::SCALE), (string) $activeDays, self::SCALE);

        return self::roundHalfUp(bcdiv($total, (string) $daysInMonth, self::SCALE));
    }

    /** Tiền điện/nước của một chỉ số: round_half_up(consumption × unit_price). */
    public static function meterAmount(string $consumption, int $unitPrice): int
    {
        self::assertDecimal($consumption);
        self::assertNonNegative($unitPrice, 'unitPrice');

        if (str_starts_with($consumption, '-')) {
            throw new InvalidArgumentException('Lượng tiêu thụ không được âm.');
        }

        return self::roundHalfUp(bcmul($consumption, (string) $unitPrice, self::SCALE));
    }

    /** Nhân tiền với hệ số thập phân chính xác; không âm và không tràn PHP integer. */
    public static function multiply(int $amount, string $factor): int
    {
        self::assertNonNegative($amount, 'amount');
        self::assertDecimal($factor);
        if (str_starts_with($factor, '-')) {
            throw new InvalidArgumentException('Hệ số không được âm.');
        }
        $product = bcmul((string) $amount, $factor, self::SCALE);
        $rounded = bcadd($product, '0.5', 0);
        if (bccomp($rounded, (string) PHP_INT_MAX, 0) > 0) {
            throw new InvalidArgumentException('Số tiền vượt giới hạn số nguyên.');
        }

        return self::roundHalfUp($product);
    }

    private static function assertDecimal(string $value): void
    {
        if (preg_match('/^-?\d+(\.\d+)?$/', $value) !== 1) {
            throw new InvalidArgumentException("Giá trị thập phân không hợp lệ: [{$value}].");
        }
    }

    private static function assertNonNegative(int $value, string $name): void
    {
        if ($value < 0) {
            throw new InvalidArgumentException("{$name} không được âm.");
        }
    }
}
