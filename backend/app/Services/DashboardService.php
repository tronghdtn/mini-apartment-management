<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\MaintenanceRequestStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\RoomStatus;
use App\Models\Building;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardService
{
    public function __construct(private readonly DebtService $debts) {}

    public function buildings(): LengthAwarePaginator
    {
        foreach (['buildings', 'rooms', 'contracts'] as $table) {
            abort_unless(Schema::hasTable($table), 503, 'Dữ liệu tổng quan tòa nhà chưa sẵn sàng trên môi trường này.');
        }

        return Building::query()->withCount([
            'rooms',
            'rooms as rented_rooms_count' => fn ($rooms) => $rooms->whereHas('contracts', fn ($contracts) => $contracts->where('status', ContractStatus::Active)),
            'rooms as available_rooms_count' => fn ($rooms) => $rooms->where('status', RoomStatus::Available),
        ])->orderBy('id')->paginate(20)->withQueryString();
    }

    public function summary(): array
    {
        foreach (['contracts', 'invoices', 'payments', 'maintenance_requests'] as $table) {
            abort_unless(Schema::hasTable($table), 503, 'Dữ liệu tổng quan chưa sẵn sàng trên môi trường này.');
        }

        $month = CarbonImmutable::now(config('app.business_timezone'))->startOfMonth();

        // Các chỉ số đọc cùng snapshot; không khóa hoặc thay đổi bản ghi nghiệp vụ.
        return DB::transaction(function () use ($month): array {
            $received = Payment::where('status', PaymentStatus::Confirmed)
                ->whereIn('method', [PaymentMethod::Cash, PaymentMethod::BankTransfer])
                ->where('reviewed_at', '>=', $month->utc())
                ->where('reviewed_at', '<', $month->addMonth()->utc())
                ->pluck('amount')->all();
            $outstanding = $this->debts->outstanding(Invoice::query())
                ->get(['total_amount', 'paid_amount'])
                ->map(fn (Invoice $invoice) => Money::remaining($invoice->total_amount, $invoice->paid_amount))->all();

            return [
                'period' => $month->format('Y-m'),
                'rented_rooms_count' => Contract::where('status', ContractStatus::Active)->distinct()->count('room_id'),
                'received_amount' => Money::aggregate($received),
                'outstanding_amount' => Money::aggregate($outstanding),
                'pending_maintenance_count' => MaintenanceRequest::where('status', MaintenanceRequestStatus::Pending)->count(),
            ];
        });
    }
}
