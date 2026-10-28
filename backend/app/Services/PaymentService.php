<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Room;
use App\Models\User;
use App\Support\Money;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class PaymentService
{
    public function ensureReady(): void
    {
        foreach (['invoices', 'invoice_items', 'payments', 'attachments', 'contracts'] as $table) {
            abort_unless(Schema::hasTable($table), 503, 'Cấu trúc thanh toán chưa sẵn sàng trên môi trường này.');
        }
    }

    private function query(): Builder
    {
        return Payment::with(['attachments', 'invoice.items', 'invoice.contract' => fn ($q) => $q->withTrashed()->with(['room.building:id,name', 'tenant:id,full_name'])]);
    }

    public function find(int $id): Payment
    {
        $this->ensureReady();

        return $this->query()->findOrFail($id);
    }

    public function paginate(User $actor, array $filters): LengthAwarePaginator
    {
        $this->ensureReady();
        $query = $this->query();
        if (! $actor->hasRole(UserRole::Admin)) {
            $query->whereHas('invoice', fn ($q) => $q->where('status', '<>', InvoiceStatus::Draft)
                ->whereHas('contract', fn ($c) => $c->withTrashed()->where('user_id', $actor->id)));
        }
        foreach (['status', 'method', 'invoice_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        return $query->orderByDesc('id')->paginate(20)->withQueryString();
    }

    public function store(Invoice $original, User $actor, array $data, ?UploadedFile $proof = null): Payment
    {
        $this->ensureReady();
        $admin = $actor->hasRole(UserRole::Admin);
        abort_unless($admin || $proof !== null, 422, 'Cần đúng một ảnh minh chứng chuyển khoản.');
        $path = $proof?->store('payment-proofs', 'private');
        try {
            return $this->locked($original, $actor, function ($invoice, $payments, $user) use ($data, $proof, $path, $admin) {
                abort_unless($admin ? $user->hasRole(UserRole::Admin) : ($user->hasRole(UserRole::Resident) && $invoice->contract->user_id === $user->id), 403, 'Bạn không có quyền gửi thanh toán này.');
                if ($admin) {
                    $this->revision($invoice->revision(), $data['expected_revision']);
                    abort_unless(in_array($data['method'], ['cash', 'bank_transfer'], true) && ($data['confirmed_received'] ?? false), 422, 'Cần xác nhận thực nhận và hình thức hợp lệ.');
                }
                $this->payable($invoice, (int) $data['amount']);
                $payment = new Payment(['amount' => (int) $data['amount'], 'method' => $admin ? $data['method'] : PaymentMethod::BankTransfer]);
                $payment->invoice_id = $invoice->id;
                $payment->submitted_by = $user->id;
                $payment->status = PaymentStatus::Pending;
                $payment->save();
                if (! $admin) {
                    $photo = new Attachment;
                    $photo->attachable_type = $payment->getMorphClass();
                    $photo->attachable_id = $payment->id;
                    $photo->collection = Attachment::PAYMENT_PROOF;
                    $photo->disk = 'private';
                    $photo->path = $path;
                    $photo->original_name = 'payment-proof.'.$proof->extension();
                    $photo->mime_type = $proof->getMimeType();
                    $photo->size_bytes = $proof->getSize();
                    $photo->save();
                } else {
                    $this->confirmed($payment, $user);
                    $payments->push($payment);
                    $this->syncInvoice($invoice, $payments);
                }

                return $this->find($payment->id);
            });
        } catch (Throwable $failure) {
            if ($path !== null) {
                Storage::disk('private')->delete($path);
            }
            throw $failure;
        }
    }

    public function confirm(Payment $original, User $actor, array $data): Payment
    {
        return $this->locked($original->invoice, $actor, function ($invoice, $payments, $user) use ($original, $data) {
            abort_unless($user->hasRole(UserRole::Admin), 403, 'Bạn không có quyền đối soát.');
            $payment = $payments->firstWhere('id', $original->id) ?? abort(409, 'Thanh toán đã thay đổi.');
            abort_unless($payment->amount === (int) $data['expected_amount'] && ($data['confirmed_received'] ?? false), 409, 'Số tiền xác nhận không khớp khoản đang đối soát.');
            if ($payment->status === PaymentStatus::Confirmed) {
                return $this->find($payment->id); // Exact receipt/reviewer/time replay; never count twice.
            }
            abort_unless($payment->status === PaymentStatus::Pending && $payment->method === PaymentMethod::BankTransfer, 409, 'Khoản này không còn chờ đối soát chuyển khoản.');
            $payment->setRelation('invoice', $invoice);
            $this->revision($payment->revision(), $data['expected_revision']);
            abort_if($payment->amount > Money::remaining($invoice->total_amount, $invoice->paid_amount), 409, 'Khoản chờ vượt số dư hiện tại; cần đối chiếu, không tự cắt số tiền.');
            $this->payable($invoice, $payment->amount);
            $photo = $this->proof($payment);
            abort_unless(Storage::disk('private')->exists($photo->path), 409, 'Ảnh minh chứng không còn sẵn sàng; cần kiểm tra trước khi xác nhận.');
            $this->confirmed($payment, $user);
            $this->syncInvoice($invoice, $payments);

            return $this->find($payment->id);
        });
    }

    public function reject(Payment $original, User $actor, array $data): Payment
    {
        return $this->locked($original->invoice, $actor, function ($invoice, $payments, $user) use ($original, $data) {
            abort_unless($user->hasRole(UserRole::Admin), 403, 'Bạn không có quyền đối soát.');
            $payment = $payments->firstWhere('id', $original->id) ?? abort(409, 'Thanh toán đã thay đổi.');
            abort_unless($payment->status === PaymentStatus::Pending, 409, 'Thanh toán đã được xử lý.');
            $payment->setRelation('invoice', $invoice);
            $this->revision($payment->revision(), $data['expected_revision']);
            $payment->status = PaymentStatus::Rejected;
            $payment->reviewed_by = $user->id;
            $payment->reviewed_at = now();
            $payment->reject_reason = $data['reject_reason'];
            $payment->save();

            return $this->find($payment->id);
        });
    }

    public function proof(Payment $payment): Attachment
    {
        $photos = $payment->attachments()->where('collection', Attachment::PAYMENT_PROOF)->where('disk', 'private')->get();
        abort_unless($photos->count() === 1, 409, 'Minh chứng chưa đủ hoặc không nhất quán; cần đối chiếu.');

        return $photos->sole();
    }

    private function locked(Invoice $original, User $actor, callable $action): Payment
    {
        $this->ensureReady();
        $parent = Contract::withTrashed()->findOrFail($original->contract_id);
        try {
            return DB::transaction(function () use ($original, $parent, $actor, $action) {
                Room::whereKey($parent->room_id)->lockForUpdate()->firstOrFail();
                $users = User::whereIn('id', [$parent->user_id, $actor->id])->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $contract = Contract::withTrashed()->whereKey($parent->id)->lockForUpdate()->firstOrFail();
                abort_unless($contract->room_id === $parent->room_id && $contract->user_id === $parent->user_id, 409, 'Hợp đồng đã thay đổi; vui lòng tải lại.');
                $invoice = Invoice::whereKey($original->id)->lockForUpdate()->firstOrFail();
                abort_unless($invoice->contract_id === $contract->id, 409, 'Hóa đơn đã thay đổi hợp đồng.');
                $invoice->setRelation('contract', $contract);
                $invoice->load('items');
                $payments = Payment::where('invoice_id', $invoice->id)->orderBy('id')->lockForUpdate()->get();
                $user = $users->get($actor->id);
                abort_unless($user && $user->isActive(), 403, 'Tài khoản không còn hoạt động.');
                $actual = Money::sum($payments->where('status', PaymentStatus::Confirmed)->pluck('amount')->all());
                abort_unless($actual === $invoice->paid_amount && $actual <= $invoice->total_amount, 409, 'Sổ thanh toán chưa khớp hóa đơn; cần đối chiếu trước.');

                return $action($invoice, $payments, $user);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Thanh toán hoặc mã biên nhận vừa được xử lý bởi thao tác khác. Vui lòng tải lại.');
        } catch (QueryException) {
            report(new RuntimeException('Thao tác thanh toán thất bại do lỗi CSDL.'));
            abort(500, 'Không thể lưu thanh toán lúc này. Vui lòng thử lại sau.');
        } catch (InvalidArgumentException) {
            $this->invalid('Số tiền vượt phạm vi được hỗ trợ.');
        }
    }

    private function payable(Invoice $invoice, int $amount): void
    {
        abort_unless(in_array($invoice->status, [InvoiceStatus::Issued, InvoiceStatus::PartiallyPaid], true), 409, 'Hóa đơn không còn ở trạng thái nhận thanh toán.');
        if ($amount < 1 || $amount > Money::MAX_VND || $amount > Money::remaining($invoice->total_amount, $invoice->paid_amount)) {
            $this->invalid('Số tiền phải lớn hơn 0 và không vượt số còn phải trả.');
        }
    }

    private function confirmed(Payment $payment, User $actor): void
    {
        $payment->status = PaymentStatus::Confirmed;
        $payment->receipt_number = 'RCP-'.now(config('app.business_timezone'))->format('Ym').'-'.str_pad((string) $payment->id, 4, '0', STR_PAD_LEFT);
        $payment->reviewed_by = $actor->id;
        $payment->reviewed_at = now();
        $payment->save();
    }

    private function syncInvoice(Invoice $invoice, Collection $payments): void
    {
        $total = Money::sum($payments->where('status', PaymentStatus::Confirmed)->pluck('amount')->all());
        abort_if($total > $invoice->total_amount, 409, 'Tổng đã xác nhận vượt tổng hóa đơn.');
        $invoice->paid_amount = $total;
        $invoice->status = $total === $invoice->total_amount ? InvoiceStatus::Paid : InvoiceStatus::PartiallyPaid;
        $invoice->save();
    }

    private function revision(string $actual, string $expected): void
    {
        abort_unless(hash_equals($actual, $expected), 409, 'Dữ liệu vừa thay đổi. Vui lòng tải lại trước khi đối soát.');
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['amount' => $message]);
    }
}
