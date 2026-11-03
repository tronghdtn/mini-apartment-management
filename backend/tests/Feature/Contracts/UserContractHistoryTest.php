<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class UserContractHistoryTest extends TestCase
{
    use DatabaseTransactions, InteractsWithSpaCookies;

    public function test_admin_history_filter_is_applied_before_pagination_and_counts(): void
    {
        $this->initializeSpaClient();
        $admin = User::factory()->role(UserRole::Admin)->create(['password' => 'History test only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $admin->phone, 'password' => 'History test only!42'])->assertOk();
        $tenant = User::factory()->create();
        $ids = Contract::factory()->count(21)->create(['user_id' => $tenant->id])->pluck('id')->all();
        $foreign = Contract::factory()->create();
        $first = $this->spa('GET', '/api/v1/contracts?user_id='.$tenant->id)->assertOk()
            ->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 21)->assertJsonPath('meta.counts.all', 21);
        $second = $this->spa('GET', '/api/v1/contracts?user_id='.$tenant->id.'&page=2')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('meta.current_page', 2)->assertJsonPath('meta.total', 21);
        $found = array_merge(array_column($first->json('data'), 'id'), array_column($second->json('data'), 'id'));
        $this->assertSame($ids, $found);
        $this->assertNotContains($foreign->id, $found);
        foreach (array_merge($first->json('data'), $second->json('data')) as $row) {
            $this->assertSame($tenant->id, $row['user_id']);
        }
    }
}
