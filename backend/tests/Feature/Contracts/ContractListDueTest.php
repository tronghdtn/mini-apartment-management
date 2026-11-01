<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ContractListDueTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    protected function setUp(): void
    {
        parent::setUp();
        $this->initializeSpaClient();
        // 17:30 UTC ngày 01/11 = 00:30 ngày 02/11 giờ Việt Nam: "hôm nay" phải là 02/11.
        Carbon::setTestNow('2026-11-01 17:30:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function login(UserRole $role = UserRole::Admin): User
    {
        $actor = User::factory()->role($role)->create(['password' => 'Due Filter Test Only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $actor->email, 'password' => 'Due Filter Test Only!42'])->assertOk();

        return $actor;
    }

    /** @return array<string, Contract> */
    private function fixtures(): array
    {
        $make = fn (string $end, string $state = 'active') => Contract::factory()->{$state}()->create(['start_date' => '2026-01-01', 'end_date' => $end]);

        return [
            'overdue' => $make('2026-11-01'),          // ngày cuối hôm qua (giờ VN) → quá hạn
            'today' => $make('2026-11-02'),            // hôm nay vẫn được ở → sắp hết hạn, chưa quá hạn
            'edge' => $make('2026-12-02'),             // hôm nay + 30 ngày → sắp hết hạn (biên)
            'later' => $make('2026-12-03'),            // ngoài cửa sổ
            'draft_past' => Contract::factory()->create(['start_date' => '2026-01-01', 'end_date' => '2026-02-01']),
            'terminated_past' => $make('2026-02-01', 'terminated'),
        ];
    }

    public function test_tab_counts_and_due_filters_use_vietnam_calendar_and_keep_status_active(): void
    {
        $this->login();
        $c = $this->fixtures();
        $all = $this->spa('GET', '/api/v1/contracts')->assertOk()
            ->assertJsonPath('meta.counts', ['all' => 6, 'draft' => 1, 'active' => 4, 'expiring' => 2, 'overdue' => 1, 'terminated' => 1, 'expired' => 0])
            ->assertJsonPath('meta.due', ['today' => '2026-11-02', 'expiring_until' => '2026-12-02', 'expiring_warning_days' => 30]);
        $this->assertSame(6, $all->json('meta.total'));

        $overdue = $this->spa('GET', '/api/v1/contracts?due=overdue')->assertOk();
        $this->assertSame([$c['overdue']->id], array_column($overdue->json('data'), 'id'));
        $this->assertSame('active', $overdue->json('data.0.status'));
        $this->assertSame(1, $overdue->json('meta.total'));

        $expiring = $this->spa('GET', '/api/v1/contracts?due=expiring&status=active')->assertOk();
        $this->assertSame([$c['today']->id, $c['edge']->id], array_column($expiring->json('data'), 'id'));
        // Đọc danh sách không đổi trạng thái hợp đồng hay phòng.
        $this->assertSame('active', $c['overdue']->fresh()->status->value);
        $this->assertSame($c['overdue']->room->status->value, $c['overdue']->room->fresh()->status->value);
    }

    public function test_counts_follow_scope_filters_and_pagination_counts_every_page(): void
    {
        $this->login();
        $c = $this->fixtures();
        $room = $c['overdue']->room_id;
        $this->spa('GET', '/api/v1/contracts?room_id='.$room.'&status=draft')->assertOk()
            ->assertJsonPath('meta.counts.all', 1)->assertJsonPath('meta.counts.overdue', 1)->assertJsonPath('meta.total', 0);
        Contract::factory()->count(21)->active()->create(['start_date' => '2026-01-01', 'end_date' => '2026-10-31']);
        $page2 = $this->spa('GET', '/api/v1/contracts?due=overdue&page=2')->assertOk();
        $this->assertSame(22, $page2->json('meta.total'));
        $this->assertSame(2, $page2->json('meta.last_page'));
        $this->assertCount(2, $page2->json('data'));
        $this->assertSame(22, $page2->json('meta.counts.overdue'));
        $this->assertStringContainsString('due=overdue', $page2->json('links.first'));
    }

    public function test_expiring_window_reads_the_saved_setting(): void
    {
        $this->login();
        $c = $this->fixtures();
        Setting::query()->updateOrCreate(['key' => 'contract.expiring_warning_days'], ['value' => '1', 'type' => 'integer', 'group' => 'contract']);
        $this->spa('GET', '/api/v1/contracts?due=expiring')->assertOk()
            ->assertJsonPath('meta.due.expiring_until', '2026-11-03')->assertJsonPath('meta.counts.expiring', 1)
            ->assertJsonPath('data.0.id', $c['today']->id);
    }

    public function test_invalid_or_conflicting_due_filter_is_rejected_and_access_is_admin_only(): void
    {
        $this->spa('GET', '/api/v1/contracts?due=overdue')->assertUnauthorized();
        $this->login(UserRole::Resident);
        $this->spa('GET', '/api/v1/contracts?due=overdue')->assertForbidden();
        $this->spa('POST', '/api/v1/auth/logout')->assertNoContent();
        $this->login();
        foreach (['due=late', 'due[]=overdue', 'due=overdue&status=draft', 'due=expiring&status=terminated'] as $query) {
            $this->spa('GET', '/api/v1/contracts?'.$query)->assertUnprocessable()->assertJsonValidationErrors('due');
        }
    }
}
