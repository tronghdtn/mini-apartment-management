<?php

namespace Tests\Feature\Database;

use App\Models\Building;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Tranh chấp kích hoạt hợp đồng bằng hai kết nối MySQL thật tới mini_apartment_test (kế hoạch §6.3 C1).
 *
 * Không dùng RefreshDatabase: kết nối thứ hai chỉ thấy dữ liệu đã commit. Dữ liệu được dọn ở tearDown.
 * Kết nối B dùng innodb_lock_wait_timeout = 1 để chứng minh B bị chặn (1205) khi A chưa commit.
 */
class GroupTwoConcurrencyTest extends TestCase
{
    private const SECOND = 'mysql_test_concurrent';

    private Connection $a;

    private Connection $b;

    /** @var list<int> */
    private array $roomIds = [];

    /** @var list<int> */
    private array $userIds = [];

    private ?int $buildingId = null;

    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate', ['--force' => true]);

        // Kết nối thứ hai: nhân bản đúng cấu hình test (cùng database + tài khoản test), không bao giờ là DB dev.
        config(['database.connections.'.self::SECOND => config('database.connections.mysql_test')]);
        $this->a = DB::connection();
        $this->b = DB::connection(self::SECOND);
        $this->assertSame('mini_apartment_test', $this->b->selectOne('select database() as db')->db);
        $this->b->statement('SET SESSION innodb_lock_wait_timeout = 1');

        $building = Building::factory()->create();
        $this->buildingId = $building->id;
        $this->roomIds = Room::factory()->for($building)->count(2)->create()->modelKeys();
        $this->userIds = User::factory()->count(3)->create()->modelKeys();
    }

    protected function tearDown(): void
    {
        foreach ([$this->a, $this->b] as $connection) {
            while ($connection->transactionLevel() > 0) {
                $connection->rollBack();
            }
        }

        DB::table('contracts')->whereIn('room_id', $this->roomIds)->delete();
        DB::table('rooms')->whereIn('id', $this->roomIds)->delete();
        DB::table('buildings')->where('id', $this->buildingId)->delete();
        DB::table('users')->whereIn('id', $this->userIds)->delete();
        DB::purge(self::SECOND);

        parent::tearDown();
    }

    public function test_second_activation_of_same_room_waits_then_fails_after_first_commits(): void
    {
        [$room] = $this->roomIds;

        $this->a->beginTransaction();
        $this->insertContract($this->a, $room, $this->userIds[0], 'active');

        // B không thể chen vào khi A chưa commit
        $this->assertDbError(1205, fn () => $this->insertContract($this->b, $room, $this->userIds[1], 'active'));

        $this->a->commit();

        // A thắng → B bị UNIQUE active_room_id chặn
        $this->assertDbError(1062, fn () => $this->insertContract($this->b, $room, $this->userIds[1], 'active'));
        $this->assertSame(1, $this->activeCount('room_id', $room));
    }

    public function test_second_activation_succeeds_if_first_rolls_back(): void
    {
        [$room] = $this->roomIds;

        $this->a->beginTransaction();
        $this->insertContract($this->a, $room, $this->userIds[0], 'active');
        $this->assertDbError(1205, fn () => $this->insertContract($this->b, $room, $this->userIds[1], 'active'));
        $this->a->rollBack();

        $this->insertContract($this->b, $room, $this->userIds[1], 'active');
        $this->assertSame(1, $this->activeCount('room_id', $room));
        $this->assertSame($this->userIds[1], (int) DB::table('contracts')->where('room_id', $room)->where('status', 'active')->value('user_id'));
    }

    public function test_concurrent_draft_to_active_for_same_room_or_same_tenant(): void
    {
        [$room, $otherRoom] = $this->roomIds;
        $draftSameRoom1 = $this->insertContract($this->a, $room, $this->userIds[0], 'draft');
        $draftSameRoom2 = $this->insertContract($this->a, $room, $this->userIds[1], 'draft');
        $draftSameTenant = $this->insertContract($this->a, $otherRoom, $this->userIds[0], 'draft');

        $this->a->beginTransaction();
        $this->a->table('contracts')->where('id', $draftSameRoom1)->update(['status' => 'active']);

        // Cùng phòng và cùng người đại diện đều bị chặn khi A chưa commit
        $this->assertDbError(1205, fn () => $this->b->table('contracts')->where('id', $draftSameRoom2)->update(['status' => 'active']));
        $this->assertDbError(1205, fn () => $this->b->table('contracts')->where('id', $draftSameTenant)->update(['status' => 'active']));

        $this->a->commit();

        $this->assertDbError(1062, fn () => $this->b->table('contracts')->where('id', $draftSameRoom2)->update(['status' => 'active']));
        $this->assertDbError(1062, fn () => $this->b->table('contracts')->where('id', $draftSameTenant)->update(['status' => 'active']));
        $this->assertSame(1, $this->activeCount('room_id', $room));
        $this->assertSame(1, $this->activeCount('user_id', $this->userIds[0]));
    }

    private function insertContract(Connection $connection, int $roomId, int $userId, string $status): int
    {
        return $connection->table('contracts')->insertGetId([
            'room_id' => $roomId,
            'user_id' => $userId,
            'status' => $status,
            'start_date' => '2026-10-01',
            'end_date' => '2027-10-01',
            'monthly_rent' => 3500000,
            'occupant_count' => 1,
        ]);
    }

    private function activeCount(string $column, int $value): int
    {
        return DB::table('contracts')->where($column, $value)->where('status', 'active')->count();
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
