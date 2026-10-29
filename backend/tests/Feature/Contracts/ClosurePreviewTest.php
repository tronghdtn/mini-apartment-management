<?php

namespace Tests\Feature\Contracts;

use App\Enums\UserRole;
use App\Models\Contract;
use App\Models\User;
use App\Services\ContractService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\InteractsWithSpaCookies;
use Tests\TestCase;

class ClosurePreviewTest extends TestCase
{
    use InteractsWithSpaCookies, RefreshDatabase;

    private function signIn(UserRole $role = UserRole::Admin): User
    {
        $user = User::factory()->role($role)->create(['password' => 'Closure test only!42']);
        $this->spa('POST', '/api/v1/auth/login', ['identifier' => $user->phone, 'password' => 'Closure test only!42'])->assertOk();

        return $user;
    }

    private function contract(): Contract
    {
        $contract = Contract::factory()->active()->create(['start_date' => '2026-10-01', 'end_date' => '2027-09-30']);
        $contract->forceFill(['early_termination_fee_type' => 'fixed', 'early_termination_fee_amount' => 2000000])->save();

        return app(ContractService::class)->find($contract->id);
    }

    public function test_preview_classifies_dates_uses_signed_fee_and_does_not_write(): void
    {
        $this->initializeSpaClient();
        $this->signIn();
        $contract = $this->contract();
        $before = DB::table('contracts')->where('id', $contract->id)->first();
        $room = DB::table('rooms')->where('id', $contract->room_id)->first();
        foreach ([['2026-10-01', 'same_day', 0], ['2026-10-02', 'early_termination', 2000000],
            ['2027-09-30', 'early_termination', 2000000], ['2027-10-01', 'on_time', 0], ['2027-10-02', 'overdue_return', 0]] as [$date, $reason, $fee]) {
            $this->spa('POST', '/api/v1/contracts/'.$contract->id.'/closure-preview', [
                'actual_end_date' => $date, 'closure_note' => 'Lý do kiểm thử', 'expected_revision' => $contract->lifecycleRevision(),
            ])->assertOk()->assertJsonPath('data.closure_reason', $reason)->assertJsonPath('data.early_termination_fee', $fee)
                ->assertJsonPath('data.is_preview', true)->assertJsonPath('data.planned_handover_date', '2027-10-01');
        }
        $this->assertEquals($before, DB::table('contracts')->where('id', $contract->id)->first());
        $this->assertEquals($room, DB::table('rooms')->where('id', $contract->room_id)->first());
        foreach (['invoices', 'payments', 'meter_readings'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_role_current_account_and_csrf_are_enforced(): void
    {
        $this->initializeSpaClient();
        $contract = $this->contract();
        $url = '/api/v1/contracts/'.$contract->id.'/closure-preview';
        $input = ['actual_end_date' => '2027-10-01', 'expected_revision' => $contract->lifecycleRevision()];
        $this->spa('POST', $url, $input)->assertUnauthorized();
        foreach ([UserRole::User, UserRole::Resident, UserRole::Technician, UserRole::Guard] as $role) {
            $this->signIn($role);
            $this->spa('POST', $url, $input)->assertForbidden();
        }
        $admin = $this->signIn();
        $this->spa('POST', $url, $input, sendCsrf: false)->assertStatus(419);
        $admin->status = 'locked';
        $admin->save();
        $this->spa('POST', $url, $input)->assertForbidden();
    }

    public function test_invalid_note_date_forged_fee_stale_and_non_active_are_rejected(): void
    {
        $this->initializeSpaClient();
        $this->signIn();
        $contract = $this->contract();
        $url = '/api/v1/contracts/'.$contract->id.'/closure-preview';
        $input = ['actual_end_date' => '2027-10-01', 'expected_revision' => $contract->lifecycleRevision()];
        foreach (['2026-10-01', '2026-10-02', '2027-10-02'] as $date) {
            $this->spa('POST', $url, array_replace($input, ['actual_end_date' => $date, 'closure_note' => '  ']))->assertUnprocessable()->assertJsonValidationErrors('closure_note');
        }
        foreach (['2026-09-30', '2026-02-30', 'invalid'] as $date) {
            $this->spa('POST', $url, array_replace($input, ['actual_end_date' => $date]))->assertUnprocessable()->assertJsonValidationErrors('actual_end_date');
        }
        $this->spa('POST', $url, $input + ['early_termination_fee' => 0])->assertUnprocessable();
        $this->spa('POST', $url, array_replace($input, ['expected_revision' => str_repeat('0', 64)]))->assertConflict();
        $this->spa('POST', '/api/v1/contracts/999999/closure-preview', $input)->assertNotFound();
        $contract->status = 'terminated';
        $contract->save();
        $this->spa('POST', $url, $input)->assertConflict();
    }
}
