<?php

namespace Tests\Feature\Database;

use App\Models\Amenity;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Ràng buộc DB của Nhóm 2: UNIQUE, generated UNIQUE (DB-01, DB-03), RESTRICT/CASCADE, UNSIGNED. */
class GroupTwoConstraintTest extends TestCase
{
    use RefreshDatabase;

    private const DUPLICATE = 1062;       // ER_DUP_ENTRY

    private const ROW_IS_REFERENCED = 1451; // ER_ROW_IS_REFERENCED_2 (RESTRICT)

    private const OUT_OF_RANGE = 1264;    // ER_WARN_DATA_OUT_OF_RANGE

    private const NO_REFERENCED_ROW = 1452; // ER_NO_REFERENCED_ROW_2

    public function test_room_code_is_unique_per_building_only(): void
    {
        // DB-01
        $a = Building::factory()->create();
        $b = Building::factory()->create();
        Room::factory()->for($a)->create(['code' => 'P101']);
        Room::factory()->for($b)->create(['code' => 'P101']);

        $this->assertDbError(self::DUPLICATE, fn () => Room::factory()->for($a)->create(['code' => 'P101']));
    }

    public function test_only_one_active_contract_per_room_and_per_tenant(): void
    {
        // DB-03 ở mức DB
        $room = Room::factory()->create();
        $tenant = User::factory()->create();

        $this->insertContract($room->id, $tenant->id, 'active');

        $this->assertDbError(self::DUPLICATE, fn () => $this->insertContract($room->id, User::factory()->create()->id, 'active'));
        $this->assertDbError(self::DUPLICATE, fn () => $this->insertContract(Room::factory()->create()->id, $tenant->id, 'active'));
    }

    public function test_many_draft_and_closed_contracts_are_allowed(): void
    {
        $room = Room::factory()->create();
        $tenant = User::factory()->create();

        foreach (['draft', 'draft', 'terminated', 'terminated', 'expired', 'active'] as $status) {
            $this->insertContract($room->id, $tenant->id, $status);
        }

        $this->assertSame(6, DB::table('contracts')->where('room_id', $room->id)->count());
        $this->assertSame(1, DB::table('contracts')->where('room_id', $room->id)->where('status', 'active')->count());
    }

    public function test_activating_a_draft_is_blocked_while_another_active_exists(): void
    {
        $room = Room::factory()->create();
        $this->insertContract($room->id, User::factory()->create()->id, 'active');
        $draftId = $this->insertContract($room->id, User::factory()->create()->id, 'draft');

        $this->assertDbError(self::DUPLICATE, fn () => DB::table('contracts')->where('id', $draftId)->update(['status' => 'active']));

        // Sau khi hợp đồng cũ thanh lý thì kích hoạt được
        DB::table('contracts')->where('room_id', $room->id)->where('status', 'active')->update(['status' => 'terminated']);
        DB::table('contracts')->where('id', $draftId)->update(['status' => 'active']);
        $this->assertSame($room->id, (int) DB::table('contracts')->where('id', $draftId)->value('active_room_id'));
    }

    public function test_contract_number_and_renewal_link_are_unique(): void
    {
        $room = Room::factory()->create();
        $tenant = User::factory()->create();
        $first = $this->insertContract($room->id, $tenant->id, 'terminated', ['contract_number' => 'HD-2026-0001']);

        $this->assertDbError(self::DUPLICATE, fn () => $this->insertContract($room->id, $tenant->id, 'draft', ['contract_number' => 'HD-2026-0001']));

        $this->insertContract($room->id, $tenant->id, 'draft', ['renewed_from_id' => $first]);
        $this->assertDbError(self::DUPLICATE, fn () => $this->insertContract($room->id, $tenant->id, 'draft', ['renewed_from_id' => $first]));
    }

    public function test_restrict_protects_history(): void
    {
        $contract = Contract::factory()->active()->create();
        $contract->occupants()->create(['full_name' => 'Người ở cùng']);
        $service = Service::factory()->create();
        $contract->contractServices()->create(['service_id' => $service->id, 'quantity' => '1', 'unit_price' => 100000, 'start_date' => '2026-10-01']);
        $metered = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $metered->utilityPrices()->create(['unit_price' => 3500, 'effective_from' => '2026-10-01']);

        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('buildings')->where('id', $contract->room->building_id)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('rooms')->where('id', $contract->room_id)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('users')->where('id', $contract->user_id)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('contracts')->where('id', $contract->id)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('services')->where('id', $service->id)->delete());
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('services')->where('id', $metered->id)->delete());

        $renewal = Contract::factory()->create(['room_id' => $contract->room_id]);
        DB::table('contracts')->where('id', $renewal->id)->update(['renewed_from_id' => $contract->id]);
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('contracts')->where('id', $contract->id)->delete());
    }

    public function test_meter_gap_confirmer_must_exist_and_is_protected(): void
    {
        // O8 (DB-D40): người xác nhận chênh lệch chỉ số là tài khoản có thật, không xóa được khi đã xác nhận
        $admin = User::factory()->create();
        $room = Room::factory()->create();
        $id = $this->insertContract($room->id, User::factory()->create()->id, 'active', [
            'meter_gap_reason' => 'Đồng hồ chạy khi phòng trống 3 ngày',
            'meter_gap_confirmed_by' => $admin->id,
        ]);

        $this->assertSame($admin->id, (int) DB::table('contracts')->where('id', $id)->value('meter_gap_confirmed_by'));
        $this->assertDbError(self::ROW_IS_REFERENCED, fn () => DB::table('users')->where('id', $admin->id)->delete());
        $this->assertDbError(self::NO_REFERENCED_ROW, fn () => DB::table('contracts')->where('id', $id)->update(['meter_gap_confirmed_by' => 999999]));

        // Generated column và ràng buộc một active/phòng không bị ảnh hưởng bởi hai cột mới
        $this->assertSame($room->id, (int) DB::table('contracts')->where('id', $id)->value('active_room_id'));
        $this->assertDbError(self::DUPLICATE, fn () => $this->insertContract($room->id, User::factory()->create()->id, 'active'));
    }

    public function test_pivot_rows_cascade_with_parent_and_reject_duplicates(): void
    {
        $building = Building::factory()->create();
        $room = Room::factory()->for($building)->create();
        [$lift, $camera] = Amenity::factory()->count(2)->create();
        $building->amenities()->attach([$lift->id, $camera->id]);
        $room->amenities()->attach($camera->id);

        $this->assertDbError(self::DUPLICATE, fn () => DB::table('building_amenities')->insert(['building_id' => $building->id, 'amenity_id' => $lift->id]));
        $this->assertDbError(self::DUPLICATE, fn () => DB::table('room_amenities')->insert(['room_id' => $room->id, 'amenity_id' => $camera->id]));

        // Xóa cứng tiện nghi → dòng pivot ở cả hai cấp tự xóa
        DB::table('amenities')->where('id', $camera->id)->delete();
        $this->assertSame(0, DB::table('building_amenities')->where('amenity_id', $camera->id)->count());
        $this->assertSame(0, DB::table('room_amenities')->where('amenity_id', $camera->id)->count());

        // Xóa phòng chưa có hợp đồng → room_amenities tự xóa; xóa tòa không còn phòng → building_amenities tự xóa
        $room->amenities()->attach($lift->id);
        DB::table('rooms')->where('id', $room->id)->delete();
        $this->assertSame(0, DB::table('room_amenities')->where('room_id', $room->id)->count());
        DB::table('buildings')->where('id', $building->id)->delete();
        $this->assertSame(0, DB::table('building_amenities')->where('building_id', $building->id)->count());
        $this->assertSame(1, Amenity::query()->whereKey($lift->id)->count(), 'Danh mục tiện nghi không bị xóa theo');
    }

    public function test_utility_price_unique_per_service_and_month(): void
    {
        $electricity = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        $electricity->utilityPrices()->create(['unit_price' => 3500, 'effective_from' => '2026-10-01']);
        $electricity->utilityPrices()->create(['unit_price' => 3800, 'effective_from' => '2026-11-01']);

        $this->assertDbError(self::DUPLICATE, fn () => $electricity->utilityPrices()->create(['unit_price' => 4000, 'effective_from' => '2026-10-01']));
    }

    public function test_unsigned_money_and_quantity_columns_reject_negatives(): void
    {
        $room = Room::factory()->create();

        $this->assertDbError(self::OUT_OF_RANGE, fn () => DB::table('rooms')->where('id', $room->id)->update(['base_price' => -1]));
        $this->assertDbError(self::OUT_OF_RANGE, fn () => $this->insertContract($room->id, User::factory()->create()->id, 'draft', ['monthly_rent' => -1]));
        $this->assertDbError(self::OUT_OF_RANGE, fn () => $this->insertContract($room->id, User::factory()->create()->id, 'draft', ['deposit_amount' => -500]));
    }

    /** @param array<string, mixed> $extra */
    private function insertContract(int $roomId, int $userId, string $status, array $extra = []): int
    {
        return DB::table('contracts')->insertGetId($extra + [
            'room_id' => $roomId,
            'user_id' => $userId,
            'status' => $status,
            'start_date' => '2026-10-01',
            'end_date' => '2027-10-01',
            'monthly_rent' => 3500000,
            'occupant_count' => 1,
        ]);
    }

    private function assertDbError(int $mysqlCode, callable $statement): void
    {
        try {
            $statement();
            $this->fail("Câu lệnh phải bị MySQL chặn với mã {$mysqlCode}");
        } catch (QueryException $e) {
            $this->assertSame($mysqlCode, $e->errorInfo[1] ?? null, $e->getMessage());
        }
    }
}
