<?php

namespace Tests\Feature\Database;

use App\Enums\BuildingStatus;
use App\Enums\ContractStatus;
use App\Enums\DepositStatus;
use App\Enums\RoomStatus;
use App\Enums\ServiceBillingType;
use App\Enums\UserRole;
use App\Models\Amenity;
use App\Models\Building;
use App\Models\Contract;
use App\Models\ContractService;
use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Quan hệ Eloquent và casts của 10 Model thuộc Nhóm 1 + 2 (2 bảng pivot không có Model riêng). */
class GroupTwoRelationshipTest extends TestCase
{
    use RefreshDatabase;

    public function test_building_room_relations_and_casts(): void
    {
        $building = Building::factory()->create(['latitude' => '21.0285', 'longitude' => '105.8542']);
        $room = Room::factory()->for($building)->create(['area' => '25.5']);

        $this->assertTrue($building->rooms->contains($room));
        $this->assertTrue($room->building->is($building));
        $this->assertSame(BuildingStatus::Active, $building->fresh()->status);
        $this->assertSame('21.0285000', $building->fresh()->latitude);

        $room = $room->fresh();
        $this->assertSame('25.50', $room->area, 'DECIMAL đọc ra dạng chuỗi, không float');
        $this->assertSame(3500000, $room->base_price);
        $this->assertSame(RoomStatus::Available, $room->status);
        $this->assertFalse($room->is_public);
    }

    public function test_room_shows_union_of_building_and_room_amenities_without_copying(): void
    {
        // DB-02 ở mức query
        $building = Building::factory()->create();
        $room = Room::factory()->for($building)->create();
        [$lift, $camera, $aircon] = Amenity::factory()->count(3)->create();
        $building->amenities()->attach([$lift->id, $camera->id]);
        $room->amenities()->attach([$camera->id, $aircon->id]);

        $room = $room->fresh();
        $this->assertEqualsCanonicalizing([$lift->id, $camera->id, $aircon->id], $room->allAmenities()->modelKeys());
        $this->assertCount(3, $room->allAmenities(), 'Tiện nghi trùng ở hai cấp chỉ hiện một lần');
        $this->assertEqualsCanonicalizing([$camera->id, $aircon->id], $room->amenities->modelKeys(), 'Không sao chép tiện nghi tòa xuống phòng');
        $this->assertTrue($camera->buildings->contains($building));
        $this->assertTrue($camera->rooms->contains($room));
    }

    public function test_contract_relations(): void
    {
        $contract = Contract::factory()->active()->create();
        $occupant = $contract->occupants()->create(['full_name' => 'Lê Văn C', 'relationship' => 'Bạn']);
        $internet = Service::factory()->create();
        $contract->contractServices()->create(['service_id' => $internet->id, 'quantity' => '1', 'unit_price' => 100000, 'start_date' => '2026-10-01']);

        $contract = $contract->fresh();
        $this->assertTrue($contract->room->is(Room::find($contract->room_id)));
        $this->assertInstanceOf(User::class, $contract->tenant);
        $this->assertTrue($contract->occupants->first()->is($occupant));
        $this->assertTrue($occupant->contract->is($contract));
        $this->assertTrue($contract->contractServices->first()->service->is($internet));
        $this->assertTrue($internet->contractServices->first()->contract->is($contract));

        $renewal = Contract::factory()->create(['room_id' => $contract->room_id, 'user_id' => $contract->user_id]);
        DB::table('contracts')->where('id', $renewal->id)->update(['renewed_from_id' => $contract->id]);
        $this->assertTrue($renewal->fresh()->renewedFrom->is($contract));
        $this->assertTrue($contract->fresh()->renewal->is($renewal));

        $admin = User::factory()->role(UserRole::Admin)->create();
        DB::table('contracts')->where('id', $contract->id)->update(['meter_gap_reason' => 'Chênh 5 kWh', 'meter_gap_confirmed_by' => $admin->id]);
        $this->assertTrue($contract->fresh()->meterGapConfirmer->is($admin));
    }

    public function test_active_contract_is_derived_from_contract_status_not_role(): void
    {
        // DB-D36: sau thanh lý vẫn là resident, nhưng không còn "đang thuê"
        $tenant = User::factory()->role(UserRole::Resident)->create();
        $contract = Contract::factory()->active()->create(['user_id' => $tenant->id]);

        $this->assertTrue($tenant->hasActiveContract());
        $this->assertTrue($tenant->activeContract->is($contract));
        $this->assertTrue($contract->room->activeContract->is($contract));

        DB::table('contracts')->where('id', $contract->id)->update(['status' => 'terminated', 'actual_end_date' => '2026-12-01']);
        $tenant = $tenant->fresh();

        $this->assertFalse($tenant->hasActiveContract());
        $this->assertNull($tenant->activeContract);
        $this->assertSame(UserRole::Resident, $tenant->role);
        $this->assertCount(1, $tenant->contracts, 'Vẫn thấy lịch sử hợp đồng');
    }

    public function test_contract_casts_and_mass_assignment_protection(): void
    {
        $room = Room::factory()->create();
        $tenant = User::factory()->create();

        $contract = Contract::create([
            'room_id' => $room->id,
            'user_id' => $tenant->id,
            'start_date' => '2026-10-01',
            'end_date' => '2027-10-01',
            'monthly_rent' => 3500000,
            'occupant_count' => 2,
            'initial_electricity_reading' => '1234.5',
            // Không được nhận từ dữ liệu nhập:
            'status' => 'active',
            'contract_number' => 'HD-2026-9999',
            'actual_end_date' => '2026-11-01',
            'active_room_id' => 999,
            'meter_gap_reason' => 'tự khai',
            'meter_gap_confirmed_by' => $tenant->id,
        ])->fresh();

        $this->assertSame(ContractStatus::Draft, $contract->status);
        $this->assertSame(DepositStatus::Unpaid, $contract->deposit_status);
        $this->assertNull($contract->contract_number);
        $this->assertNull($contract->actual_end_date);
        $this->assertNull($contract->active_room_id);
        $this->assertNull($contract->meter_gap_reason, 'O8: không sửa qua form thông thường');
        $this->assertNull($contract->meter_gap_confirmed_by);
        $this->assertSame('1234.50', $contract->initial_electricity_reading);
        $this->assertSame('2026-10-01', $contract->toArray()['start_date']);
        $this->assertSame(3500000, $contract->monthly_rent);

        $room->update(['status' => 'occupied']);
        $this->assertSame(RoomStatus::Available, $room->fresh()->status, 'Trạng thái phòng không mass-assign');
    }

    public function test_draft_contract_soft_delete(): void
    {
        $draft = Contract::factory()->create();
        $draft->delete();

        $this->assertNull(Contract::find($draft->id));
        $this->assertNotNull(Contract::withTrashed()->find($draft->id));
    }

    public function test_scopes(): void
    {
        $public = Room::factory()->create(['is_public' => true]);
        Room::factory()->create(['is_public' => false]);
        $occupiedPublic = Room::factory()->create(['is_public' => true]);
        DB::table('rooms')->where('id', $occupiedPublic->id)->update(['status' => 'occupied']);
        $this->assertSame([$public->id], Room::publicAvailable()->pluck('id')->all());

        $electricity = Service::factory()->metered('ELECTRICITY', 'kWh')->create();
        Service::factory()->create();
        $this->assertSame([$electricity->id], Service::metered()->pluck('id')->all());
        $this->assertTrue($electricity->fresh()->isMetered());
        $this->assertSame(ServiceBillingType::Metered, $electricity->fresh()->billing_type);
        $this->assertNull($electricity->fresh()->price);

        $electricity->utilityPrices()->create(['unit_price' => 3500, 'effective_from' => '2026-10-01']);
        $this->assertSame('2026-10-01', $electricity->utilityPrices()->first()->toArray()['effective_from']);

        $contract = Contract::factory()->create();
        $closed = $contract->contractServices()->create(['service_id' => Service::factory()->create()->id, 'quantity' => '2', 'unit_price' => 50000, 'start_date' => '2026-10-01', 'end_date' => '2026-10-31']);
        $open = $contract->contractServices()->create(['service_id' => Service::factory()->create()->id, 'quantity' => '1', 'unit_price' => 100000, 'start_date' => '2026-11-01']);

        $this->assertEqualsCanonicalizing([$closed->id], ContractService::effectiveBetween('2026-10-01', '2026-10-31')->pluck('id')->all());
        $this->assertEqualsCanonicalizing([$open->id], ContractService::effectiveBetween('2026-11-01', '2026-11-30')->pluck('id')->all());
        $this->assertEqualsCanonicalizing([$closed->id, $open->id], ContractService::effectiveBetween('2026-10-31', '2026-11-01')->pluck('id')->all());
        $this->assertSame('2.00', $closed->fresh()->quantity);
    }
}
