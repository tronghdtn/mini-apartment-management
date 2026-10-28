<?php

namespace App\Http\Requests\Payment;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Invoice;
use App\Models\Payment;
use App\Rules\NotBoolean;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class PaymentRequest extends FormRequest
{
    private ?Payment $currentPayment = null;

    private ?Invoice $currentInvoice = null;

    public function payment(): Payment
    {
        return $this->currentPayment ?? abort(404);
    }

    public function invoice(): Invoice
    {
        return $this->currentInvoice ?? abort(404);
    }

    public function authorize(): bool
    {
        $action = $this->route()->getActionMethod();
        if (! Gate::allows(in_array($action, ['confirm', 'reject'], true) ? 'review' : 'viewAny', Payment::class)) {
            return false;
        }
        app(PaymentService::class)->ensureReady();
        if ($action === 'store') {
            $this->currentInvoice = app(InvoiceService::class)->find((int) $this->route('invoice'));

            return Gate::allows('createForInvoice', [Payment::class, $this->currentInvoice]);
        }
        if ($this->route('payment') !== null) {
            $this->currentPayment = app(PaymentService::class)->find((int) $this->route('payment'));

            return Gate::allows(in_array($action, ['confirm', 'reject'], true) ? 'review' : 'view', $this->currentPayment);
        }

        return true;
    }

    public function rules(): array
    {
        $money = ['required', new NotBoolean, 'integer', 'min:1', 'max:9007199254740991'];
        $revision = ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'];
        $received = ['required', 'boolean', 'accepted'];
        $admin = $this->user()->hasRole(UserRole::Admin);
        $rules = match ($this->route()->getActionMethod()) {
            'index' => ['status' => ['sometimes', Rule::enum(PaymentStatus::class)], 'method' => ['sometimes', Rule::enum(PaymentMethod::class)],
                'invoice_id' => ['sometimes', new NotBoolean, 'integer', 'min:1'], 'page' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:2147483647']],
            'store' => ['amount' => $money, ...($admin ? ['method' => ['required', Rule::in(['cash', 'bank_transfer'])],
                'expected_revision' => $revision, 'confirmed_received' => $received] : ['proof' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:5120']])],
            'confirm' => ['expected_revision' => $revision, 'expected_amount' => $money, 'confirmed_received' => $received],
            'reject' => ['expected_revision' => $revision, 'reject_reason' => ['required', 'string', 'max:2000']],
            default => [],
        };
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['required' => ':attribute là bắt buộc.', 'string' => ':attribute phải là chuỗi.', 'integer' => ':attribute phải là số nguyên.',
            'min' => ':attribute phải từ :min trở lên.', 'max' => ':attribute vượt giới hạn :max.', 'missing' => 'Không được gửi trường :attribute.',
            'regex' => 'Phiên bản không hợp lệ. Vui lòng tải lại.', 'boolean' => ':attribute không hợp lệ.',
            'accepted' => 'Cần xác nhận đã thực nhận tiền.', 'in' => ':attribute không hợp lệ.', 'enum' => ':attribute không hợp lệ.',
            'file' => 'Minh chứng phải là tệp tải lên.', 'mimes' => 'Minh chứng phải có nội dung JPG, PNG hoặc WebP.',
            'extensions' => 'Đuôi ảnh phải là JPG, PNG hoặc WebP.', 'proof.max' => 'Ảnh minh chứng không được lớn hơn 5 MB.'];
    }

    public function attributes(): array
    {
        return ['amount' => 'Số tiền VND', 'expected_amount' => 'Số tiền đang đối soát', 'proof' => 'Ảnh minh chứng',
            'confirmed_received' => 'Xác nhận thực nhận', 'reject_reason' => 'Lý do từ chối', 'method' => 'Hình thức thanh toán', 'expected_revision' => 'Phiên bản'];
    }
}
