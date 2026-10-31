<?php

namespace Tests\Feature\Maintenance;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class MaintenanceRequestApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private array $migrations = [];

    private bool $transaction = false;

    private array $userIds = [];

    private array $contractIds = [];

    private array $roomIds = [];

    private array $buildingIds = [];

    private array $requestIds = [];

    private array $photoPaths = [];

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-30 08:00:00 UTC');
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        foreach ([
            '2026_10_14_400017_create_maintenance_requests_table.php',
            '2026_10_14_400019_create_attachments_table.php',
            '2026_10_14_400020_create_notifications_table.php',
        ] as $file) {
            $migration = require database_path('migrations/pending/'.$file);
            $migration->up();
            $this->migrations[] = $migration;
        }
        DB::beginTransaction();
        $this->transaction = true;
        Storage::fake('private');
        $this->initializeSpaClient();
    }

    protected function tearDown(): void
    {
        try {
            if ($this->transaction) {
                $this->assertSame(1, DB::transactionLevel());
                DB::rollBack();
            } else {
                $this->cleanCommittedFixtures();
            }
            foreach (array_reverse($this->migrations) as $migration) {
                $migration->down();
            }
            Storage::disk('private')->deleteDirectory('maintenance');
        } finally {
            Carbon::setTestNow();
            parent::tearDown();
        }
    }

    public function test_text_capacity_is_validated_in_bytes_before_writing_any_maintenance_action(): void
    {
        $owner = $this->user(UserRole::Resident, '0900080041');
        $this->activeContract($owner);
        $admin = $this->user(UserRole::Admin, '0900080042');
        $technician = $this->user(UserRole::Technician, '0900080043');
        $tooLong = [str_repeat('x', 65536), str_repeat('😀', 16384)];
        $atCapacity = str_repeat('😀', 16383).'abc';
        $this->assertSame(65535, strlen($atCapacity));

        $this->login($owner);
        foreach ($tooLong as $description) {
            $this->spa('POST', '/api/v1/maintenance-requests', ['title' => 'Kiểm tra dung lượng',
                'description' => $description, 'priority' => 'normal'])->assertUnprocessable()->assertJsonValidationErrors('description');
        }
        $this->assertDatabaseCount('maintenance_requests', 0);
        $created = $this->spa('POST', '/api/v1/maintenance-requests', ['title' => 'Kiểm tra dung lượng',
            'description' => $atCapacity, 'priority' => 'normal'])->assertCreated()->json('data');
        $this->requestIds[] = $created['id'];
        $url = '/api/v1/maintenance-requests/'.$created['id'];

        $this->login($admin);
        foreach ($tooLong as $note) {
            $this->spa('PATCH', $url, ['admin_note' => $note])->assertUnprocessable()->assertJsonValidationErrors('admin_note');
            $this->spa('POST', "$url/assign", ['assigned_to' => $technician->id, 'admin_note' => $note])
                ->assertUnprocessable()->assertJsonValidationErrors('admin_note');
            $this->spa('POST', "$url/reject", ['admin_note' => $note])->assertUnprocessable()->assertJsonValidationErrors('admin_note');
        }
        $this->assertDatabaseHas('maintenance_requests', ['id' => $created['id'], 'status' => 'pending', 'admin_note' => null, 'assigned_to' => null]);
        $this->spa('PATCH', $url, ['admin_note' => $atCapacity])->assertOk();
        $this->spa('POST', "$url/assign", ['assigned_to' => $technician->id, 'admin_note' => str_repeat('x', 65535)])->assertOk();
        $this->login($technician);
        $this->spa('POST', "$url/start")->assertOk();
        foreach ($tooLong as $note) {
            $this->spa('POST', "$url/resolve", ['handler_note' => $note])->assertUnprocessable()->assertJsonValidationErrors('handler_note');
        }
        $this->assertDatabaseHas('maintenance_requests', ['id' => $created['id'], 'status' => 'in_progress', 'handler_note' => null]);
        $this->spa('POST', "$url/resolve", ['handler_note' => $atCapacity])->assertOk();
        $saved = DB::table('maintenance_requests')->where('id', $created['id'])->first();
        $this->assertSame($atCapacity, $saved->description);
        $this->assertSame($atCapacity, $saved->handler_note);
        $this->assertSame(65535, strlen($saved->admin_note));
    }

    private function user(UserRole $role, string $phone): User
    {
        $user = User::factory()->role($role)->create(['phone' => $phone, 'password' => 'Maintenance test only!42']);
        $this->userIds[] = $user->id;

        return $user;
    }

    private function activeContract(User $owner): Contract
    {
        $contract = Contract::factory()->active()->create(['user_id' => $owner->id]);
        $room = $contract->room()->firstOrFail();
        $this->contractIds[] = $contract->id;
        $this->roomIds[] = $room->id;
        $this->buildingIds[] = $room->building_id;
        Room::whereKey($room->id)->update(['status' => 'occupied']);

        return $contract;
    }

    private function login(User $user): void
    {
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Maintenance test only!42'])->assertOk();
    }

    private function photo(string $name = 'repair.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII='));
    }

    private function createRequest(array $files = []): array
    {
        $response = $this->spa('POST', '/api/v1/maintenance-requests', ['title' => 'Vòi nước rò rỉ', 'description' => 'Nước nhỏ liên tục dưới bồn rửa.',
            'priority' => 'high'], files: $files ? ['photos' => $files] : [])->assertCreated();
        $data = $response->json('data');
        $this->requestIds[] = $data['id'];

        return $data;
    }

    public function test_resident_context_creation_private_photos_validation_and_owned_scope(): void
    {
        $this->spa('GET', '/api/v1/maintenance-requests')->assertUnauthorized();
        $guest = $this->user(UserRole::User, '0900080001');
        $this->login($guest);
        $this->spa('GET', '/api/v1/maintenance-requests')->assertForbidden();
        $this->spa('GET', '/api/v1/maintenance-requests/context')->assertForbidden();

        $owner = $this->user(UserRole::Resident, '0900080002');
        $contract = $this->activeContract($owner);
        $room = $contract->room;
        $this->login($owner);
        $this->spa('GET', '/api/v1/maintenance-requests/context')->assertOk()
            ->assertJsonPath('data.room.id', $room->id)->assertJsonPath('data.room.code', $room->code);
        $this->spa('GET', '/api/v1/maintenance-requests?status=unknown')->assertUnprocessable();
        $this->spa('GET', '/api/v1/maintenance-requests?page=0')->assertUnprocessable();
        $this->spa('POST', '/api/v1/maintenance-requests', ['title' => str_repeat('x', 151), 'description' => 'Sai', 'priority' => 'urgent'])->assertUnprocessable();
        $this->spa('POST', '/api/v1/maintenance-requests', ['title' => 'Tôi tự chọn ưu tiên', 'description' => 'Mức ngoài enum.', 'priority' => 'critical'])->assertUnprocessable();
        $this->spa('POST', '/api/v1/maintenance-requests', ['title' => 'Không nhận user id', 'description' => 'Thử mass assignment.',
            'priority' => 'normal', 'user_id' => 1])->assertUnprocessable();
        $this->spa('POST', '/api/v1/maintenance-requests', ['title' => 'Không nhận trạng thái', 'description' => 'Không thể tự kết thúc.',
            'priority' => 'normal', 'status' => 'resolved'])->assertUnprocessable();
        $tooMany = array_map(fn ($i) => $this->photo('room-'.$i.'.png'), range(1, 6));
        $this->spa('POST', '/api/v1/maintenance-requests', ['title' => 'Quá nhiều ảnh', 'description' => 'Sáu ảnh.', 'priority' => 'normal'], files: ['photos' => $tooMany])
            ->assertUnprocessable();
        $this->spa('POST', '/api/v1/maintenance-requests', ['title' => 'Ảnh không hỗ trợ', 'description' => 'SVG không được nhận.', 'priority' => 'normal'],
            files: ['photos' => [UploadedFile::fake()->createWithContent('repair.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>')]])->assertUnprocessable();
        $this->spa('POST', '/api/v1/maintenance-requests', ['title' => 'Ảnh quá lớn', 'description' => 'Vượt 5 MB.', 'priority' => 'normal'],
            files: ['photos' => [UploadedFile::fake()->create('repair.png', 5121, 'image/png')]])->assertUnprocessable();

        $noContract = $this->user(UserRole::Resident, '0900080005');
        $this->login($noContract);
        $this->spa('GET', '/api/v1/maintenance-requests/context')->assertForbidden();
        $this->login($owner);

        $request = $this->createRequest([$this->photo()]);
        $this->assertStringStartsWith('MR-202610-', $request['code']);
        $this->assertSame('pending', $request['status']);
        $this->assertSame('high', $request['priority']);
        $this->assertNull($request['reporter']);
        $this->assertCount(1, $request['photos']);
        foreach (['contract_id', 'user_id', 'cost', 'path', 'phone', 'email', 'id_number'] as $private) {
            $this->assertArrayNotHasKey($private, $request);
        }
        $photoPath = DB::table('attachments')->where('attachable_type', 'maintenance_request')->where('attachable_id', $request['id'])->value('path');
        $this->photoPaths[] = $photoPath;
        $this->assertSame('private', DB::table('attachments')->where('attachable_id', $request['id'])->value('disk'));
        $this->spa('GET', $request['photos'][0]['url'])->assertOk()->assertHeader('Content-Type', 'image/png')
            ->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('Cache-Control', 'no-store, private');
        $this->spa('GET', '/api/v1/maintenance-requests')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $request['id']);
        $this->assertSame('occupied', Room::findOrFail($room->id)->status->value); // Q17: no status change while contract is active.

        $foreign = $this->user(UserRole::Resident, '0900080003');
        $this->activeContract($foreign);
        $this->login($foreign);
        $this->spa('GET', '/api/v1/maintenance-requests')->assertOk()->assertJsonCount(0, 'data');
        $this->spa('GET', '/api/v1/maintenance-requests/'.$request['id'])->assertForbidden();
        $guard = $this->user(UserRole::Guard, '0900080004');
        $this->login($guard);
        $this->spa('GET', '/api/v1/maintenance-requests')->assertForbidden();
        $this->spa('GET', $request['photos'][0]['url'])->assertForbidden();
    }

    public function test_admin_priority_assignment_and_technician_contact_visibility_and_transitions(): void
    {
        $owner = $this->user(UserRole::Resident, '0900080011');
        $contract = $this->activeContract($owner);
        $admin = $this->user(UserRole::Admin, '0900080012');
        $technician = $this->user(UserRole::Technician, '0900080013');
        $otherTechnician = $this->user(UserRole::Technician, '0900080014');
        $this->login($owner);
        $request = $this->createRequest();

        $this->login($admin);
        $this->spa('PATCH', '/api/v1/maintenance-requests/'.$request['id'], ['priority' => 'urgent'])->assertOk()
            ->assertJsonPath('data.priority', 'urgent')->assertJsonPath('data.reporter.phone', $owner->phone);
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/assign', ['assigned_to' => $technician->id, 'priority' => 'normal',
            'admin_note' => 'Liên hệ trong giờ hành chính.'])->assertOk()->assertJsonPath('data.assignee.id', $technician->id)
            ->assertJsonPath('data.priority', 'normal');
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/assign', ['assigned_to' => $otherTechnician->id + 999999])->assertUnprocessable();

        $this->login($technician);
        $this->spa('GET', '/api/v1/maintenance-requests')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.reporter.phone', $owner->phone);
        $this->spa('GET', '/api/v1/maintenance-requests/'.$request['id'])->assertOk()->assertJsonPath('data.reporter.full_name', $owner->full_name);
        $this->spa('GET', '/api/v1/maintenance-requests/'.$request['id'].'/start')->assertStatus(405);
        $this->spa('PATCH', '/api/v1/maintenance-requests/'.$request['id'], ['priority' => 'urgent'])->assertForbidden();
        $this->login($otherTechnician);
        $this->spa('GET', '/api/v1/maintenance-requests/'.$request['id'])->assertForbidden();
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/start')->assertForbidden();

        $this->login($technician);
        DB::table('users')->where('id', $technician->id)->update(['status' => 'locked']);
        $this->spa('GET', '/api/v1/maintenance-requests')->assertForbidden();
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/start')->assertUnauthorized();
        DB::table('users')->where('id', $technician->id)->update(['status' => 'active']);

        $this->login($technician);
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/start')->assertOk()->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.reporter.phone', $owner->phone);
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/resolve', [])->assertUnprocessable();
        $resolved = $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/resolve', ['handler_note' => 'Đã thay gioăng và kiểm tra.'])
            ->assertOk()->assertJsonPath('data.status', 'resolved')->assertJsonPath('data.reporter.full_name', $owner->full_name);
        $this->assertArrayNotHasKey('phone', $resolved->json('data.reporter'));
        $this->assertSame('occupied', Room::findOrFail($contract->room_id)->status->value);
    }

    public function test_admin_reject_reopen_conflict_and_after_commit_notifications_are_deduplicated(): void
    {
        $owner = $this->user(UserRole::Resident, '0900080021');
        $this->activeContract($owner);
        $admin = $this->user(UserRole::Admin, '0900080022');
        $technician = $this->user(UserRole::Technician, '0900080023');
        $this->login($owner);
        $request = $this->createRequest();
        $this->assertDatabaseCount('notifications', 0); // afterCommit has not run inside the outer test transaction.

        $this->login($admin);
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/assign', ['assigned_to' => $technician->id])->assertOk();
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/reject')->assertUnprocessable();
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/reject', ['admin_note' => 'Không thuộc phạm vi sửa chữa.'])
            ->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->login($technician);
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/start')->assertStatus(409);
        $this->login($admin);
        $this->spa('POST', '/api/v1/maintenance-requests/'.$request['id'].'/reopen')->assertStatus(409);

        $this->login($owner);
        $second = $this->createRequest();
        $this->login($admin);
        $this->spa('POST', '/api/v1/maintenance-requests/'.$second['id'].'/assign', ['assigned_to' => $technician->id])->assertOk();
        $this->login($technician);
        $this->spa('POST', '/api/v1/maintenance-requests/'.$second['id'].'/start')->assertOk();
        Carbon::setTestNow('2026-10-30 08:00:05 UTC');
        $this->spa('POST', '/api/v1/maintenance-requests/'.$second['id'].'/resolve', ['handler_note' => 'Đã hoàn tất.'])->assertOk();
        $this->login($admin);
        $this->spa('POST', '/api/v1/maintenance-requests/'.$second['id'].'/reopen')->assertOk()->assertJsonPath('data.status', 'in_progress');
        $this->assertDatabaseCount('notifications', 0);

        DB::commit();
        $this->transaction = false;
        $this->assertSame(2, DB::table('notifications')->where('type', 'maintenance.created')->where('notifiable_id', $admin->id)->count());
        $this->assertSame(2, DB::table('notifications')->where('type', 'maintenance.assigned')->where('notifiable_id', $technician->id)->count());
        $this->assertSame(3, DB::table('notifications')->where('type', 'maintenance.status_changed')->where('notifiable_id', $owner->id)
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.link')) = ?", ['/resident/requests/'.$second['id']])->count());
        $this->login($owner);
        $this->spa('GET', '/api/v1/notifications')->assertOk()->assertJsonFragment(['link' => '/resident/requests/'.$second['id']]);
    }

    private function cleanCommittedFixtures(): void
    {
        if ($this->requestIds === [] && $this->userIds === []) {
            return;
        }
        DB::transaction(function (): void {
            DB::table('notifications')->where('notifiable_type', 'user')->whereIn('notifiable_id', $this->userIds)->delete();
            if ($this->requestIds !== []) {
                $attachments = DB::table('attachments')->where('attachable_type', 'maintenance_request')->whereIn('attachable_id', $this->requestIds)->pluck('path');
                foreach ($attachments as $path) {
                    Storage::disk('private')->delete($path);
                }
                DB::table('attachments')->where('attachable_type', 'maintenance_request')->whereIn('attachable_id', $this->requestIds)->delete();
                DB::table('maintenance_requests')->whereIn('id', $this->requestIds)->delete();
            }
            DB::table('contracts')->whereIn('id', $this->contractIds)->delete();
            DB::table('rooms')->whereIn('id', $this->roomIds)->delete();
            DB::table('buildings')->whereIn('id', $this->buildingIds)->delete();
            DB::table('sessions')->whereIn('user_id', $this->userIds)->delete();
            DB::table('users')->whereIn('id', $this->userIds)->delete();
        });
    }
}
