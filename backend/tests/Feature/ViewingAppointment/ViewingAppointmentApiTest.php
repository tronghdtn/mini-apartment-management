<?php

namespace Tests\Feature\ViewingAppointment;

use App\Enums\UserRole;
use App\Models\Room;
use App\Models\User;
use App\Models\ViewingAppointment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\Process\Process;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

/** Own pending DDL, committed afterCommit events, no RefreshDatabase or shared fixtures. */
class ViewingAppointmentApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private array $users = [];

    private ?Room $room = null;

    private bool $ownsSchema = false;

    private $migration;

    private $notifications;

    /** @var list<string> Session có sẵn trước test; mọi session khác (kể cả khách chưa đăng nhập) do test này tạo. */
    private array $sessionsBefore = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertFalse(Schema::hasTable('viewing_appointments'));
        $this->assertFalse(Schema::hasTable('notifications'));
        $this->assertSame(0, DB::table('users')->count());
        $this->migration = require database_path('migrations/pending/2026_10_14_400018_create_viewing_appointments_table.php');
        $this->notifications = require database_path('migrations/pending/2026_10_14_400020_create_notifications_table.php');
        $this->migration->up();
        $this->notifications->up();
        $this->ownsSchema = true;
        $this->sessionsBefore = DB::table('sessions')->pluck('id')->all();
        Carbon::setTestNow(Carbon::parse('2026-10-30 01:00:00', 'UTC'));
        $this->room = Room::factory()->create(['is_public' => true]);
        $this->initializeSpaClient();
    }

    protected function tearDown(): void
    {
        try {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Carbon::setTestNow();
            if ($this->ownsSchema) {
                DB::table('notifications')->where('notifiable_type', 'user')->whereIn('notifiable_id', $this->users)->delete();
                if (Schema::hasTable('viewing_appointments')) {
                    DB::table('viewing_appointments')->where('room_id', $this->room->id)->delete();
                    $this->migration->down();
                }
                $this->notifications->down();
                DB::table('sessions')->whereNotIn('id', $this->sessionsBefore)->delete();
                DB::table('users')->whereIn('id', $this->users)->delete();
                DB::table('rooms')->where('id', $this->room->id)->delete();
                DB::table('buildings')->where('id', $this->room->building_id)->delete();
            }
        } finally {
            parent::tearDown();
        }
    }

    private function login(UserRole $role = UserRole::User): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Viewing test only!42']);
        $this->users[] = $user->id;
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Viewing test only!42'])->assertOk();

        return $user;
    }

    private function book(array $changes = [], string $ip = '192.0.2.10')
    {
        // Each independent validation attempt uses its own IP; throttle has a dedicated test below.
        return $this->spa('POST', '/api/v1/viewing-appointments', array_replace([
            'room_id' => $this->room->id, 'guest_name' => 'Khách kiểm thử', 'guest_phone' => '0901234567',
            'preferred_at' => '2026-10-30T10:00:00+07:00', 'website' => '',
        ], $changes), ['REMOTE_ADDR' => $ip]);
    }

    public function test_admin_room_filter_runs_before_pagination_and_combines_with_status_and_vietnam_date(): void
    {
        DB::beginTransaction();
        $this->login(UserRole::Admin);
        // Admin history also works for rooms that are no longer public.
        $this->room->update(['is_public' => false]);
        $otherRoom = Room::factory()->create(['building_id' => $this->room->building_id]);
        $ids = [];
        for ($n = 0; $n < 21; $n++) {
            $ids[] = ViewingAppointment::forceCreate(['room_id' => $this->room->id, 'code' => 'ROOM-QA-'.$n,
                'guest_name' => 'Khách kiểm thử', 'guest_phone' => '0901234567',
                'preferred_at' => '2026-10-29 17:30:00', 'status' => $n === 20 ? 'confirmed' : 'pending'])->id;
        }
        ViewingAppointment::forceCreate(['room_id' => $otherRoom->id, 'code' => 'ROOM-QA-OTHER',
            'guest_name' => 'Phòng khác', 'guest_phone' => '0901234568', 'preferred_at' => '2026-10-29 17:30:00', 'status' => 'confirmed']);
        $base = '/api/v1/viewing-appointments?room_id='.$this->room->id;
        $first = $this->spa('GET', $base)->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 21);
        $second = $this->spa('GET', $base.'&page=2')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 21);
        $this->assertSame($ids, array_merge(array_column($first->json('data'), 'id'), array_column($second->json('data'), 'id')));
        $this->spa('GET', $base.'&status=confirmed&date=2026-10-30')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ids[20]);
        $this->spa('GET', $base.'&date=2026-10-29')->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/viewing-appointments?room_id=9007199254740991')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_room_filter_is_rejected_for_non_admin_and_invalid_values(): void
    {
        $this->spa('GET', '/api/v1/viewing-appointments?room_id='.$this->room->id)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('GET', '/api/v1/viewing-appointments?room_id='.$this->room->id)->assertUnprocessable()->assertJsonValidationErrors('room_id');
        }
        $this->login(UserRole::Admin);
        foreach (['0', '-1', '1.2', 'invalid', 'true', '9007199254740992'] as $roomId) {
            $this->spa('GET', '/api/v1/viewing-appointments?room_id='.$roomId)->assertUnprocessable()->assertJsonValidationErrors('room_id');
        }
    }

    public function test_anonymous_booking_is_private_and_room_phone_duplicate_is_blocked(): void
    {
        $this->spa('GET', '/api/v1/viewing-appointments')->assertUnauthorized();
        $this->spa('POST', '/api/v1/viewing-appointments', [], sendCsrf: false)->assertStatus(419);
        $data = $this->book()->assertCreated()->json('data');
        $this->assertMatchesRegularExpression('/^APT-202610-\d{4,}$/', $data['code']);
        $this->assertSame('2026-10-30T03:00:00.000000Z', $data['preferred_at']);
        $this->assertFalse($data['can_cancel']);
        $this->assertArrayNotHasKey('ip_address', $data);
        $this->assertArrayNotHasKey('user_id', $data);
        $this->book()->assertConflict();
        $this->book(['guest_phone' => '+84901234567'])->assertConflict();
        $this->login();
        $this->spa('GET', '/api/v1/viewing-appointments')->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/viewing-appointments/'.$data['id'])->assertNotFound();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$data['id'].'/cancel')->assertForbidden();
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_validation_hours_honeypot_forgery_and_room_availability(): void
    {
        $cases = [['preferred_at' => '2026-10-30T07:59:00+07:00'], ['preferred_at' => '2026-10-30T20:01:00+07:00'],
            ['preferred_at' => '2026-10-30T08:00:00+07:00'], ['preferred_at' => '2026-02-30T10:00:00+07:00'],
            ['preferred_at' => '2026-10-31T10:00'], ['website' => 'spam'], ['user_id' => 1], ['status' => 'confirmed'],
            ['guest_phone' => 'wrong'], ['guest_name' => ''], ['room_id' => true], ['preferred_at' => '2040-01-01T10:00:00+07:00']];
        foreach ($cases as $index => $changes) {
            $this->book($changes, '192.0.2.'.($index + 20))->assertUnprocessable();
        }
        $this->room->forceFill(['is_public' => false])->save();
        $this->book([], '192.0.2.50')->assertConflict();
        $this->room->forceFill(['is_public' => true, 'status' => 'maintenance'])->save();
        $this->book([], '192.0.2.51')->assertConflict();
        $this->room->forceFill(['status' => 'available'])->save();
        $this->book(['preferred_at' => '2026-10-30T20:00:00+07:00'], '192.0.2.52')->assertCreated();
        $this->assertDatabaseCount('viewing_appointments', 1);
    }

    public function test_owner_cancel_and_admin_reschedule_reconfirm_send_private_notifications(): void
    {
        $owner = $this->login();
        $id = $this->book()->assertCreated()->json('data.id');
        $this->spa('GET', '/api/v1/viewing-appointments')->assertJsonCount(1, 'data');
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/confirm')->assertForbidden();
        $this->login(UserRole::Admin);
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/confirm')->assertOk()->assertJsonPath('data.status', 'confirmed');
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/confirm')->assertConflict();
        $this->assertDatabaseCount('notifications', 1);
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/reschedule', ['preferred_at' => '2026-10-30T11:00:00+07:00', 'admin_note' => 'Khách đề nghị đổi giờ'])->assertOk()->assertJsonPath('data.status', 'pending');
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/confirm')->assertOk();
        $this->assertDatabaseCount('notifications', 2);
        // Return to the original owner using the real session API.
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $owner->phone, 'password' => 'Viewing test only!42'])->assertOk();
        $this->spa('GET', '/api/v1/notifications')->assertOk()->assertJsonPath('data.0.link', '/account/appointments');
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/cancel')->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/cancel')->assertConflict();
        $this->assertSame(3, DB::table('notifications')->where('notifiable_id', $owner->id)->count());
        $this->book()->assertCreated(); // Cancellation releases duplicate protection, preserves old history.
        $this->assertDatabaseCount('viewing_appointments', 2);
    }

    public function test_guard_today_boundary_order_actor_and_admin_completion(): void
    {
        $this->login();
        $id = $this->book()->assertCreated()->json('data.id');
        $this->login(UserRole::Admin);
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/confirm')->assertOk();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/complete')->assertConflict();
        $guard = $this->login(UserRole::Guard);
        $this->spa('GET', '/api/v1/viewing-appointments')->assertJsonCount(1, 'data');
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/check-out')->assertConflict();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/check-in', ['checked_in_by' => 1])->assertUnprocessable();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/check-in', ['guard_note' => 'Đã đón khách'])->assertOk();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/check-in')->assertConflict();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/complete')->assertForbidden();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/check-out')->assertOk();
        $item = ViewingAppointment::findOrFail($id);
        $this->assertSame($guard->id, $item->checked_in_by);
        $this->assertSame($guard->id, $item->checked_out_by);
        $this->login(UserRole::Admin);
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/reschedule', ['preferred_at' => '2026-10-31T09:00:00+07:00', 'admin_note' => 'Đổi'])->assertConflict();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/cancel')->assertConflict();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/complete')->assertOk()->assertJsonPath('data.status', 'completed');
    }

    public function test_other_roles_no_access_locked_account_and_time_cutoff(): void
    {
        $owner = $this->login();
        $id = $this->book()->assertCreated()->json('data.id');
        foreach ([UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($role);
            $this->spa('GET', '/api/v1/viewing-appointments/'.$id)->assertNotFound();
            $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/confirm')->assertForbidden();
            $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/cancel')->assertForbidden();
        }
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $owner->phone, 'password' => 'Viewing test only!42'])->assertOk();
        ViewingAppointment::whereKey($id)->update(['preferred_at' => now()]);
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/cancel')->assertConflict();
        User::whereKey($owner->id)->update(['status' => 'locked']);
        $this->book([], '192.0.2.70')->assertForbidden();
        $this->spa('GET', '/api/v1/viewing-appointments')->assertForbidden();
    }

    public function test_guard_query_uses_vietnam_day_even_when_utc_date_differs(): void
    {
        $id = $this->book()->assertCreated()->json('data.id');
        ViewingAppointment::whereKey($id)->update(['status' => 'confirmed', 'preferred_at' => '2026-10-29 17:30:00']);
        $this->login(UserRole::Guard);
        $this->spa('GET', '/api/v1/viewing-appointments')->assertJsonCount(1, 'data');
        ViewingAppointment::whereKey($id)->update(['preferred_at' => '2026-10-30 17:00:00']);
        $this->spa('GET', '/api/v1/viewing-appointments')->assertJsonCount(0, 'data');
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/check-in')->assertForbidden();
    }

    public function test_rate_limit_is_five_attempts_per_remote_ip_not_forwarded_header(): void
    {
        $ip = '192.0.2.201';
        for ($i = 0; $i < 5; $i++) {
            $this->book(['website' => 'bot'], $ip)->assertUnprocessable();
        }
        $this->spa('POST', '/api/v1/viewing-appointments', [], ['REMOTE_ADDR' => $ip, 'HTTP_X_FORWARDED_FOR' => '198.51.100.10'])->assertStatus(429);
        $this->book([], '192.0.2.202')->assertCreated();
    }

    public function test_schema_unavailable_and_rollback_preserves_history(): void
    {
        $id = $this->book()->assertCreated()->json('data.id');
        try {
            $this->migration->down();
            $this->fail('Must preserve history');
        } catch (\RuntimeException $error) {
            $this->assertStringContainsString('lịch sử', $error->getMessage());
        }
        DB::table('viewing_appointments')->where('id', $id)->delete();
        $this->migration->down();
        $this->book([], '192.0.2.203')->assertStatus(503);
        $this->login(UserRole::Admin);
        $this->spa('GET', '/api/v1/viewing-appointments')->assertStatus(503);
    }

    public function test_pagination_filtering_and_validation_do_not_mix_owners(): void
    {
        $owner = $this->login();
        $id = $this->book()->assertCreated()->json('data.id');
        $source = ViewingAppointment::findOrFail($id);
        foreach (range(1, 20) as $index) {
            $copy = $source->replicate(['code']);
            $copy->forceFill(['status' => 'cancelled', 'preferred_at' => '2026-11-01 03:00:00'])->save();
        }
        $this->spa('GET', '/api/v1/viewing-appointments?page=2')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 21);
        $this->spa('GET', '/api/v1/viewing-appointments?status=pending&date=2026-10-30')->assertJsonCount(1, 'data');
        $this->spa('GET', '/api/v1/viewing-appointments?date=2026-11-01')->assertJsonCount(20, 'data');
        $this->spa('GET', '/api/v1/viewing-appointments?status=unknown')->assertUnprocessable();
        $this->spa('GET', '/api/v1/viewing-appointments?page=0')->assertUnprocessable();
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/cancel', [], sendCsrf: false)->assertStatus(419);
        $this->login();
        $this->spa('GET', '/api/v1/viewing-appointments')->assertJsonCount(0, 'data');
        $this->login(UserRole::Admin);
        $this->spa('GET', '/api/v1/viewing-appointments?page=2')->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 21);
        $this->spa('POST', '/api/v1/viewing-appointments/'.$id.'/reschedule', [])->assertUnprocessable();
    }

    public function test_two_real_processes_cannot_create_duplicate_open_appointments(): void
    {
        $processes = [];
        try {
            DB::beginTransaction();
            Room::whereKey($this->room->id)->lockForUpdate()->firstOrFail();
            foreach ([1, 2] as $index) {
                $process = new Process([PHP_BINARY, base_path('tests/Support/RunViewingBooking.php'), (string) $this->room->id], base_path(), ['DB_CONNECTION' => 'mysql_test', 'DB_DATABASE' => 'mini_apartment_test', 'DB_URL' => '', 'APP_ENV' => 'testing']);
                $process->setTimeout(60);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 30;
            while (count(array_filter($processes, fn ($process) => str_contains($process->getOutput(), "READY\n"))) !== 2) {
                if (microtime(true) > $deadline) {
                    $this->fail('Viewing children did not reach the ready barrier.');
                }
                usleep(10000);
            }
            foreach ($processes as $process) {
                $this->assertTrue($process->isRunning(), 'Child bypassed parent room lock.');
            }
            DB::commit();
            $statuses = [];
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), $process->getErrorOutput().$process->getOutput());
                $lines = explode("\n", trim($process->getOutput()));
                $statuses[] = json_decode(end($lines), true, flags: JSON_THROW_ON_ERROR)['status'];
            }
            sort($statuses);
            $this->assertSame([201, 409], $statuses);
            $this->assertDatabaseCount('viewing_appointments', 1);
        } finally {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
        }
    }
}
