<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class AccountProfileConcurrencyTest extends TestCase
{
    public function test_two_real_processes_cannot_overwrite_each_others_password_change(): void
    {
        $this->assertSame(0, User::count(), 'Committed race fixtures require an empty guarded test DB.');
        $user = User::factory()->create(['password' => 'Profile race test old!42']);
        $processes = [];
        try {
            DB::beginTransaction();
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            for ($n = 0; $n < 2; $n++) {
                $process = new Process([PHP_BINARY, base_path('tests/Support/RunProfileAction.php'), json_encode(['actor' => $user->id])],
                    base_path(), ['APP_ENV' => 'testing', 'DB_CONNECTION' => 'mysql_test']);
                $process->setTimeout(45);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 30;
            while (count(array_filter($processes, fn ($child) => str_contains($child->getOutput(), "READY\n"))) < 2) {
                if (microtime(true) > $deadline) {
                    $this->fail('Profile children did not reach the user lock barrier.');
                }
                usleep(10000);
            }
            foreach ($processes as $child) {
                $this->assertTrue($child->isRunning(), 'The user row lock must block both children.');
            }
            DB::commit();
            $statuses = [];
            foreach ($processes as $child) {
                $this->assertSame(0, $child->wait());
                $statuses[] = json_decode(explode("READY\n", $child->getOutput())[1], true, flags: JSON_THROW_ON_ERROR)['status'];
            }
            sort($statuses);
            $this->assertSame([204, 409], $statuses);
            $this->assertTrue(Hash::check('Profile race test new!43', $user->fresh()->getAuthPassword()));
            $this->assertFalse(Hash::check('Profile race test old!42', $user->fresh()->getAuthPassword()));
        } finally {
            while (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($processes as $child) {
                if ($child->isRunning()) {
                    $child->stop();
                }
            }
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->delete();
        }
    }
}
