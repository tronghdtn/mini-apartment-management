<?php

namespace Tests\Feature\Rooms;

use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Building;
use App\Models\Room;
use App\Models\User;
use App\Services\RoomPhotoService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Symfony\Component\Process\Process;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class RoomPhotoApiTest extends TestCase
{
    use InteractsWithSpaCookies;

    private $migration;

    private array $users = [];

    private array $rooms = [];

    private array $buildings = [];

    private array $sessions = [];

    private User $admin;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame(0, Artisan::call('migrate', ['--database' => self::TEST_CONNECTION, '--force' => true]));
        $this->assertSame(0, User::count());
        $this->assertSame(0, Room::count());
        $this->assertFalse(Schema::hasTable('attachments'));
        $this->migration = require database_path('migrations/pending/2026_10_14_400019_create_attachments_table.php');
        $this->migration->up();
        Storage::fake('private');
        $this->sessions = DB::table('sessions')->pluck('id')->all();
        $this->admin = $this->user();
        $this->room = $this->newRoom();
        $this->initializeSpaClient();
    }

    protected function tearDown(): void
    {
        try {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            if (Schema::hasTable('attachments')) {
                if (Attachment::whereNotIn('attachable_id', $this->rooms)->exists()) {
                    throw new \RuntimeException('Foreign photos, refusing cleanup');
                }
                Attachment::whereIn('attachable_id', $this->rooms)->delete();
                $this->migration?->down();
            }
            Room::whereIn('id', $this->rooms)->delete();
            Building::whereIn('id', $this->buildings)->delete();
            DB::table('sessions')->whereNotIn('id', $this->sessions)->delete();
            User::whereIn('id', $this->users)->delete();
        } finally {
            parent::tearDown();
        }
    }

    private function user(UserRole $role = UserRole::Admin): User
    {
        $u = User::factory()->role($role)->create(['full_name' => 'ROOMPHOTO test only', 'password' => 'Gallery tests only!42']);
        $this->users[] = $u->id;

        return $u;
    }

    private function newRoom(): Room
    {
        $b = Building::factory()->create(['name' => 'ROOMPHOTO test building '.count($this->buildings)]);
        $this->buildings[] = $b->id;
        $r = Room::factory()->create(['building_id' => $b->id, 'is_public' => true, 'status' => 'available']);
        $this->rooms[] = $r->id;

        return $r;
    }

    private function login(?User $u = null): void
    {
        $u ??= $this->admin;
        $this->initializeSpaClient();
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $u->phone, 'password' => 'Gallery tests only!42'])->assertOk();
    }

    private function url(?Room $room = null): string
    {
        return '/api/v1/rooms/'.($room ?? $this->room)->id.'/photos';
    }

    private function images(int $n = 1): array
    {
        return array_map(fn ($i) => UploadedFile::fake()->createWithContent('photo-'.$i.'.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII=')), range(1, $n));
    }

    private function upload(array $files, array $data = []): TestResponse
    {
        return $this->spa('POST', $this->url(), $data, files: ['photos' => $files]);
    }

    private function seedPhotos(int $n = 2): Collection
    {
        return app(RoomPhotoService::class)->store($this->room, $this->admin, $this->images($n));
    }

    public function test_all_admin_routes_require_auth_and_reject_other_roles(): void
    {
        foreach (['GET', 'POST', 'PUT', 'DELETE'] as $method) {
            $path = $this->url().match ($method) {
                'PUT' => '/1/cover','DELETE' => '/1',default => ''
            };
            $this->spa($method, $path)->assertUnauthorized();
        }
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->login($this->user($role));
            foreach (['GET', 'POST', 'PUT', 'DELETE'] as $method) {
                $path = $this->url().match ($method) {
                    'PUT' => '/1/cover','DELETE' => '/1',default => ''
                };
                $this->spa($method, $path)->assertForbidden();
            }
            $this->spa('GET', $this->url().'/1/content')->assertForbidden();
        }
    }

    public function test_existing_admin_session_is_revoked_when_locked(): void
    {
        $this->login();
        $this->admin->forceFill(['status' => 'locked'])->save();
        $this->spa('GET', $this->url())->assertForbidden();
        $this->spa('GET', $this->url())->assertUnauthorized();
    }

    public function test_upload_is_private_201_with_one_cover_and_only_safe_metadata(): void
    {
        $this->login();
        $response = $this->upload($this->images(2))->assertCreated()->assertJsonCount(2, 'data');
        foreach ($response->json('data') as $i => $data) {
            $this->assertSame(['id', 'url', 'is_cover', 'sort_order'], array_keys($data));
            $this->assertSame($i === 0, $data['is_cover']);
            $this->assertStringStartsWith($this->url(), $data['url']);
            $a = Attachment::findOrFail($data['id']);
            $this->assertSame('room', $a->attachable_type);
            $this->assertSame('private', $a->disk);
            Storage::disk('private')->assertExists($a->path);
        }
        $this->spa('GET', '/api/v1/rooms/'.$this->room->id)->assertOk()->assertJsonCount(2, 'data.photos');
        $this->spa('GET', '/api/v1/public/rooms/'.$this->room->id)->assertOk()->assertJsonCount(2, 'data.photos')->assertJsonPath('data.photos.0.url', '/api/v1/public/rooms/'.$this->room->id.'/photos/'.$response->json('data.0.id'));
    }

    public function test_empty_is_a_real_empty_array(): void
    {
        $this->login();
        $this->spa('GET', $this->url())->assertExactJson(['data' => []]);
        $this->spa('GET', '/api/v1/public/rooms/'.$this->room->id)->assertJsonPath('data.photos', []);
    }

    public function test_content_has_actual_image_mime_and_private_cache_headers(): void
    {
        $p = $this->seedPhotos(1)->first();
        $this->login();
        $r = $this->spa('GET', $this->url().'/'.$p->id.'/content')->assertOk();
        $r->assertHeader('Content-Type', 'image/png')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString('no-store', $r->headers->get('Cache-Control'));
        $this->assertNotEmpty($r->streamedContent());
    }

    public function test_public_image_checks_parent_visibility_and_building_each_time(): void
    {
        $p = $this->seedPhotos(1)->first();
        $url = '/api/v1/public/rooms/'.$this->room->id.'/photos/'.$p->id;
        $this->spa('GET', $url)->assertOk();
        foreach (['occupied', 'maintenance', 'inactive'] as $status) {
            $this->room->forceFill(['status' => $status])->save();
            $this->spa('GET', $url)->assertNotFound();
        }
        $this->room->forceFill(['status' => 'available', 'is_public' => false])->save();
        $this->spa('GET', $url)->assertNotFound();
        $this->room->forceFill(['is_public' => true])->save();
        $this->room->building->forceFill(['status' => 'inactive'])->save();
        $this->spa('GET', $url)->assertNotFound();
        $this->spa('GET', '/api/v1/public/rooms')->assertJsonCount(0, 'data');
    }

    public function test_cross_room_collection_and_disk_cannot_be_read_or_changed(): void
    {
        $p = $this->seedPhotos(1)->first();
        $other = $this->newRoom();
        $this->login();
        foreach (['/content', '/cover', ''] as $action) {
            $method = match ($action) {
                '/cover' => 'PUT','' => 'DELETE',default => 'GET'
            };
            $this->spa($method, $this->url($other).'/'.$p->id.$action, $method === 'PUT' ? ['expected_cover_id' => null] : [])->assertNotFound();
        }
        foreach ([['collection' => 'payment_proof'], ['attachable_type' => 'payment'], ['disk' => 'public']] as $attrs) {
            $bad = $p->replicate();
            $bad->forceFill($attrs)->save();
            $this->spa('GET', '/api/v1/public/rooms/'.$this->room->id.'/photos/'.$bad->id)->assertNotFound();
        }
        $this->assertNotNull($p->fresh());
    }

    public function test_invalid_files_and_server_owned_metadata_are_rejected_without_writes(): void
    {
        $this->login();
        $this->spa('POST', $this->url())->assertUnprocessable()->assertJsonValidationErrors('photos');
        $this->upload($this->images(21))->assertUnprocessable()->assertJsonValidationErrors('photos');
        foreach ([UploadedFile::fake()->create('spoof.png', 1, 'text/plain'), $this->images()[0]->size(5121)] as $file) {
            $this->upload([$file])->assertUnprocessable()->assertJsonValidationErrors('photos.0');
        }
        $this->upload($this->images(), ['disk' => 'public', 'path' => 'fake', 'role' => 'admin'])
            ->assertUnprocessable()->assertJsonValidationErrors(['disk', 'path', 'role']);
        $this->assertSame(0, Attachment::count());
        $this->assertSame([], Storage::disk('private')->allFiles('room-gallery'));
    }

    public function test_exact_thirty_mib_accepted_but_one_byte_more_has_no_partial_write(): void
    {
        $this->login();
        $files = $this->images(6);
        foreach ($files as $f) {
            $f->size(5120);
        }
        $this->upload($files)->assertCreated()->assertJsonCount(6, 'data');
        $too = $this->images(7);
        foreach (array_slice($too, 0, 6) as $f) {
            $f->size(5120);
        }$too[0]->sizeToReport = 5 * 1024 * 1024 - 67;
        $too[6]->sizeToReport = 68;
        $this->upload($too)->assertUnprocessable()->assertJsonValidationErrors('photos');
        $this->assertSame(6, Attachment::count());
        $this->assertCount(6, Storage::disk('private')->allFiles('room-gallery'));
    }

    public function test_per_room_cap_cleans_staged_files_and_accepts_exact_twenty(): void
    {
        $this->seedPhotos(19);
        $this->login();
        $this->upload($this->images(2))->assertConflict();
        $this->assertCount(19, Storage::disk('private')->allFiles('room-gallery'));
        $this->upload($this->images())->assertCreated()->assertJsonCount(20, 'data');
        $this->upload($this->images())->assertConflict();
        $this->assertSame(20, Attachment::count());
        $this->assertCount(20, Storage::disk('private')->allFiles('room-gallery'));
    }

    public function test_cover_replay_is_safe_and_stale_selection_conflicts(): void
    {
        $photos = $this->seedPhotos(3);
        $this->login();
        $this->spa('PUT', $this->url().'/'.$photos[1]->id.'/cover', ['expected_cover_id' => $photos[0]->id])->assertOk()->assertJsonPath('data.0.id', $photos[1]->id);
        $before = Attachment::orderBy('id')->get()->toJson();
        $this->spa('PUT', $this->url().'/'.$photos[1]->id.'/cover', ['expected_cover_id' => $photos[0]->id])->assertOk();
        $this->assertSame($before, Attachment::orderBy('id')->get()->toJson());
        $this->spa('PUT', $this->url().'/'.$photos[2]->id.'/cover', ['expected_cover_id' => $photos[0]->id])->assertConflict();
        $this->assertSame(1, Attachment::where('is_cover', true)->count());
        $this->spa('PUT', $this->url().'/'.$photos[2]->id.'/cover', [])->assertUnprocessable();
    }

    public function test_remove_commits_then_deletes_file_and_chooses_next_cover(): void
    {
        $photos = $this->seedPhotos(2);
        $this->login();
        $this->spa('DELETE', $this->url().'/'.$photos[0]->id)->assertNoContent();
        Storage::disk('private')->assertMissing($photos[0]->path);
        $this->assertTrue($photos[1]->fresh()->is_cover);
        $this->spa('DELETE', $this->url().'/'.$photos[0]->id)->assertNotFound();
        $this->assertSame(1, Attachment::count());
    }

    public function test_remove_non_cover_preserves_cover_and_last_photo_leaves_empty(): void
    {
        $photos = $this->seedPhotos(2);
        $this->login();
        $this->spa('DELETE', $this->url().'/'.$photos[1]->id)->assertNoContent();
        $this->assertTrue($photos[0]->fresh()->is_cover);
        $this->spa('DELETE', $this->url().'/'.$photos[0]->id)->assertNoContent();
        $this->spa('GET', $this->url())->assertExactJson(['data' => []]);
    }

    public function test_missing_file_or_unsafe_path_is_404_without_exposing_storage(): void
    {
        $p = $this->seedPhotos(1)->first();
        Storage::disk('private')->delete($p->path);
        $this->spa('GET', '/api/v1/public/rooms/'.$this->room->id.'/photos/'.$p->id)->assertNotFound();
        $p->forceFill(['path' => '../payment-proofs/private.png'])->save();
        $this->spa('GET', '/api/v1/public/rooms/'.$this->room->id.'/photos/'.$p->id)->assertNotFound();
    }

    public function test_database_failure_rolls_back_rows_and_removes_only_staged_files(): void
    {
        $fail = true;
        Attachment::creating(function ($a) use (&$fail) {
            if ($fail && $a->collection === Attachment::ROOM_GALLERY) {
                throw new \RuntimeException('Injected test failure');
            }
        });
        try {
            app(RoomPhotoService::class)->store($this->room, $this->admin, $this->images(2));
            $this->fail('Expected injected DB failure');
        } catch (\RuntimeException$e) {
            $this->assertSame('Injected test failure', $e->getMessage());
        } finally {
            $fail = false;
        }
        $this->assertSame(0, Attachment::count());
        $this->assertSame([], Storage::disk('private')->allFiles('room-gallery'));
    }

    public function test_failed_physical_cleanup_does_not_falsely_roll_back_committed_metadata(): void
    {
        $p = $this->seedPhotos(1)->first();
        $this->login();
        $disk = Storage::disk('private');
        $proxy = \Mockery::mock($disk);
        $proxy->shouldReceive('delete')->once()->andReturn(false);
        Storage::shouldReceive('disk')->with('private')->andReturn($proxy);
        Exceptions::fake();
        $this->spa('DELETE', $this->url().'/'.$p->id)->assertNoContent();
        $this->assertSame(0, Attachment::count());
        $this->assertTrue($disk->exists($p->path));
        Exceptions::assertReported(fn (\RuntimeException $e) => $e->getMessage() === 'Không thể dọn tệp ảnh phòng sau khi gỡ metadata.');
        $disk->delete($p->path);
    }

    public function test_real_processes_serialize_album_capacity_and_cover_selection(): void
    {
        $this->seedPhotos(19);
        foreach (['upload', 'cover'] as $mode) {
            $photos = app(RoomPhotoService::class)->list($this->room);
            $processes = [];
            $ready = [];
            try {
                DB::beginTransaction();
                Room::whereKey($this->room->id)->lockForUpdate()->firstOrFail();
                foreach ([1, 2] as $index) {
                    $ready[$index] = sys_get_temp_dir().'/gallery-ready-'.bin2hex(random_bytes(8));
                    $payload = ['mode' => $mode, 'room' => $this->room->id, 'actor' => $this->admin->id,
                        'root' => Storage::disk('private')->path(''), 'ready' => $ready[$index],
                        'photo' => $photos[$index]->id, 'expected' => $photos->firstWhere('is_cover', true)->id];
                    $process = new Process([PHP_BINARY, base_path('tests/Support/room_photo_worker.php'), json_encode($payload)], base_path(),
                        ['APP_ENV' => 'testing', 'DB_CONNECTION' => self::TEST_CONNECTION, 'DB_DATABASE' => self::TEST_DATABASE, 'DB_USERNAME' => self::TEST_DATABASE, 'DB_URL' => '', 'RUN_MIGRATIONS' => 'false']);
                    $process->setTimeout(35);
                    $process->start();
                    $processes[] = $process;
                }
                $deadline = microtime(true) + 15;
                while ((! is_file($ready[1]) || ! is_file($ready[2])) && microtime(true) < $deadline) {
                    usleep(10000);
                }
                $this->assertFileExists($ready[1]);
                $this->assertFileExists($ready[2]);
                DB::commit();
                $statuses = [];
                foreach ($processes as $process) {
                    $process->wait();
                    $this->assertTrue($process->isSuccessful(), 'Gallery worker failed, output withheld');
                    $statuses[] = json_decode($process->getOutput(), true, 512, JSON_THROW_ON_ERROR)['status'];
                }
                sort($statuses);
                $this->assertSame($mode === 'upload' ? [201, 409] : [200, 409], $statuses);
                $this->assertSame(20, Attachment::count());
                $this->assertSame(1, Attachment::where('is_cover', true)->count());
                $this->assertCount(20, Storage::disk('private')->allFiles('room-gallery'));
            } finally {
                while (DB::transactionLevel() > 0) {
                    DB::rollBack();
                }
                foreach ($processes as $process) {
                    if ($process->isRunning()) {
                        $process->stop();
                    }
                }
                foreach ($ready as $file) {
                    if (is_file($file)) {
                        unlink($file);
                    }
                }
            }
        }
    }

    public function test_missing_attachment_schema_returns_503_for_gallery_not_fake_success(): void
    {
        $this->migration->down();
        $this->login();
        $this->spa('GET', $this->url())->assertStatus(503);
    }
}
