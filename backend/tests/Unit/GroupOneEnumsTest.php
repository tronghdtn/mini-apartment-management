<?php

namespace Tests\Unit;

use App\Enums\BuildingStatus;
use App\Enums\ContractStatus;
use App\Enums\DepositStatus;
use App\Enums\InvoiceItemType;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Enums\MeterReadingKind;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\RoomStatus;
use App\Enums\ServiceBillingType;
use App\Enums\ServiceStatus;
use App\Enums\SettingType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** Giá trị Enum (Nhóm 1–3) phải khớp đúng chuỗi lưu trong DB theo docs/09_DATABASE_DESIGN.md. */
class GroupOneEnumsTest extends TestCase
{
    /** @return array<string, array{class-string<\BackedEnum>, list<string>}> */
    public static function enums(): array
    {
        return [
            'users.role' => [UserRole::class, ['user', 'resident', 'admin', 'technician', 'guard']],
            'users.status' => [UserStatus::class, ['active', 'locked']],
            'buildings.status' => [BuildingStatus::class, ['active', 'inactive']],
            'services.billing_type' => [ServiceBillingType::class, ['per_room', 'per_person', 'per_unit', 'metered']],
            'services.status' => [ServiceStatus::class, ['active', 'inactive']],
            'settings.type' => [SettingType::class, ['string', 'integer', 'boolean', 'json']],
            // Nhóm 2 — expired/transferred khai báo sẵn cho gia hạn (SHOULD), MVP chưa dùng
            'rooms.status' => [RoomStatus::class, ['available', 'occupied', 'maintenance', 'inactive']],
            'contracts.status' => [ContractStatus::class, ['draft', 'active', 'terminated', 'expired']],
            'contracts.deposit_status' => [DepositStatus::class, ['unpaid', 'held', 'settled', 'transferred']],
            // Nhóm 3 — adjustment khai báo sẵn (SHOULD)
            'meter_readings.kind' => [MeterReadingKind::class, ['periodic', 'final']],
            'invoices.type' => [InvoiceType::class, ['monthly', 'final', 'adjustment']],
            'invoices.status' => [InvoiceStatus::class, ['draft', 'issued', 'partially_paid', 'paid', 'cancelled']],
            // DB-D67/P7: hai loại dòng tất toán đã được duyệt, không mở loại tiền cọc.
            'invoice_items.item_type' => [InvoiceItemType::class, ['rent', 'electricity', 'water', 'service', 'discount', 'other', 'termination_fee', 'damage']],
            'payments.method' => [PaymentMethod::class, ['cash', 'bank_transfer', 'deposit']],
            'payments.status' => [PaymentStatus::class, ['pending', 'confirmed', 'rejected']],
        ];
    }

    /**
     * @param  class-string<\BackedEnum>  $enum
     * @param  list<string>  $values
     */
    #[DataProvider('enums')]
    public function test_enum_values_match_design(string $enum, array $values): void
    {
        $this->assertSame($values, array_map(fn (\BackedEnum $case) => $case->value, $enum::cases()));
    }
}
