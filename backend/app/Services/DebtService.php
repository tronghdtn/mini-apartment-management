<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Models\Contract;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DebtService
{
    public function ensureReady(): void
    {
        foreach (['invoices', 'contracts', 'users', 'rooms', 'buildings', 'payments'] as $table) {
            abort_unless(Schema::hasTable($table), 503, 'Dữ liệu công nợ chưa sẵn sàng trên môi trường này.');
        }
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        $this->ensureReady();
        $today = CarbonImmutable::now(config('app.business_timezone'))->toDateString();
        $needle = trim($filters['search'] ?? '');
        $contracts = Contract::withTrashed()
            ->whereHas('invoices', fn (Builder $query) => $this->matching($query, $filters, $today, $needle))
            ->with([
                'tenant:id,full_name',
                'room:id,building_id,code',
                'room.building:id,name',
                'invoices' => fn ($query) => $this->outstanding($query)->orderBy('due_date')->orderBy('id'),
            ])
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return $contracts;
    }

    public function summary(): array
    {
        $today = CarbonImmutable::now(config('app.business_timezone'))->toDateString();
        $row = DB::table('invoices as i')->join('contracts as c', 'c.id', '=', 'i.contract_id')
            ->whereIn('i.status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value])
            ->where('i.total_amount', '>', 0)->whereColumn('i.paid_amount', '<', 'i.total_amount')
            ->selectRaw('COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS total_outstanding')
            ->selectRaw('COALESCE(SUM(CASE WHEN i.due_date < ? THEN i.total_amount - i.paid_amount ELSE 0 END), 0) AS overdue_outstanding', [$today])
            ->selectRaw('COUNT(*) AS invoice_count')
            ->selectRaw('COUNT(DISTINCT c.user_id) AS debtor_count')
            ->first();

        return [
            'total_outstanding' => (string) $row->total_outstanding,
            'overdue_outstanding' => (string) $row->overdue_outstanding,
            'invoice_count' => (int) $row->invoice_count,
            'debtor_count' => (int) $row->debtor_count,
        ];
    }

    public function today(): string
    {
        return CarbonImmutable::now(config('app.business_timezone'))->toDateString();
    }

    public function outstanding(Builder|Relation $query): Builder|Relation
    {
        return $query->whereIn('status', [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid])
            ->where('total_amount', '>', 0)
            ->whereColumn('paid_amount', '<', 'total_amount');
    }

    private function matching(Builder $query, array $filters, string $today, string $needle): Builder
    {
        $this->outstanding($query);
        if (($filters['status'] ?? 'all') === 'overdue') {
            $query->whereNotNull('due_date')->where('due_date', '<', $today);
        } elseif (($filters['status'] ?? 'all') === 'not_due') {
            $query->where(fn (Builder $due) => $due->whereNull('due_date')->orWhere('due_date', '>=', $today));
        }

        if ($needle !== '') {
            $like = '%'.strtr($needle, ['\\' => '\\\\', '%' => '\\%', '_' => '\\_']).'%';
            $query->where(function (Builder $search) use ($like) {
                $search->where('invoice_number', 'like', $like)
                    ->orWhereHas('contract', fn (Builder $contract) => $contract->withTrashed()->where('contract_number', 'like', $like)
                        ->orWhereHas('tenant', fn (Builder $tenant) => $tenant->where('full_name', 'like', $like))
                        ->orWhereHas('room', fn (Builder $room) => $room->where('code', 'like', $like)
                            ->orWhereHas('building', fn (Builder $building) => $building->where('name', 'like', $like))));
            });
        }

        return $query;
    }
}
