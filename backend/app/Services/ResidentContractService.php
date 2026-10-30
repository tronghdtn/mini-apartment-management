<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;

/** Read-only owner projection; does not expand the Admin contract routes or mutate lifecycle data. */
class ResidentContractService
{
    public function ensureReady(): void
    {
        app(ContractService::class)->ensureReady();
        abort_unless(Schema::hasTable('invoices') && Schema::hasColumns('contracts', ContractTermsService::SNAPSHOT_FIELDS),
            503, 'Hồ sơ hợp đồng chưa được triển khai đầy đủ trên môi trường này.');
    }

    public function query(User $user): Builder
    {
        return Contract::withTrashed()->where('user_id', $user->id)->whereIn('status', ['active', 'terminated', 'expired'])
            ->with('room.building');
    }

    public function detail(User $user, int $id): Contract
    {
        return $this->query($user)->with(['contractServices.service', 'occupants',
            'invoices' => fn ($query) => $query->where('type', 'final')->whereNotNull('issued_at')->where('status', '!=', 'cancelled')->orderByDesc('id')])
            ->findOrFail($id);
    }
}
