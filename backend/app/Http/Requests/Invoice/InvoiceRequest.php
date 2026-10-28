<?php

namespace App\Http\Requests\Invoice;

use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Models\Invoice;
use App\Rules\NotBoolean;
use App\Services\InvoiceService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class InvoiceRequest extends FormRequest
{
    private ?Invoice $currentInvoice = null;

    public function invoice(): Invoice
    {
        return $this->currentInvoice ?? abort(404);
    }

    public function authorize(): bool
    {
        $action = $this->route()->getActionMethod();
        if (! Gate::allows(in_array($action, ['index', 'show'], true) ? 'viewAny' : 'create', Invoice::class)) {
            return false;
        }
        app(InvoiceService::class)->ensureReady();
        if ($this->route('invoice') !== null) {
            $this->currentInvoice = app(InvoiceService::class)->find((int) $this->route('invoice'));

            return Gate::allows($action === 'show' ? 'view' : 'update', $this->currentInvoice);
        }

        return true;
    }

    public function rules(): array
    {
        $id = ['bail', new NotBoolean, 'integer', 'min:1'];
        $period = ['date_format:Y-m-d', 'after_or_equal:1000-01-01', 'before_or_equal:9999-12-31', 'ends_with:-01'];
        $revision = ['required', 'string', 'regex:/^[a-f0-9]{64}$/D'];
        $other = ['description' => ['required', 'string', 'max:255'],
            'amount' => ['required', new NotBoolean, 'integer', 'min:1', 'max:9007199254740991'],
            'basis' => ['required', 'string', 'max:2000'], 'expected_revision' => $revision];
        $rules = match ($this->route()->getActionMethod()) {
            'index' => ['status' => ['sometimes', Rule::enum(InvoiceStatus::class)], 'type' => ['sometimes', Rule::enum(InvoiceType::class)],
                'period' => ['sometimes', ...$period], 'contract_id' => ['sometimes', ...$id], 'room_id' => ['sometimes', ...$id],
                'overdue' => ['sometimes', 'boolean'], 'page' => ['sometimes', ...$id, 'max:2147483647']],
            'store' => ['contract_id' => ['required', ...$id, Rule::exists('contracts', 'id')->whereNull('deleted_at')],
                'period' => ['required', ...$period], 'related_invoice_id' => ['sometimes', ...$id]],
            'addOther', 'updateOther' => $other,
            'removeOther', 'cancel' => ['expected_revision' => $revision, 'reason' => ['required', 'string', 'max:2000']],
            'issue', 'refresh' => ['expected_revision' => $revision],
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
            'min' => ':attribute phải từ :min trở lên.', 'max' => ':attribute vượt giới hạn :max.',
            'date_format' => ':attribute phải đúng định dạng năm-tháng-ngày.', 'ends_with' => 'Kỳ hóa đơn phải là ngày 01 của tháng.',
            'after_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.', 'before_or_equal' => ':attribute ngoài phạm vi ngày lưu trữ.',
            'regex' => 'Phiên bản hóa đơn không hợp lệ. Vui lòng tải lại.', 'exists' => ':attribute không tồn tại.',
            'enum' => ':attribute không hợp lệ.', 'boolean' => ':attribute không hợp lệ.', 'missing' => 'Không được gửi trường :attribute.'];
    }

    public function attributes(): array
    {
        return ['contract_id' => 'Hợp đồng', 'period' => 'Kỳ hóa đơn', 'description' => 'Tên khoản thu', 'amount' => 'Số tiền VND',
            'basis' => 'Lý do/căn cứ thu', 'reason' => 'Lý do', 'expected_revision' => 'Phiên bản hóa đơn'];
    }
}
