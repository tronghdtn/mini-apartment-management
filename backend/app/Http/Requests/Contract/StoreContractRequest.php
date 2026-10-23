<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use App\Models\Room;
use App\Models\User;
use App\Rules\MaxTextBytes;
use App\Rules\NotBoolean;
use App\Services\ContractService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('create', Contract::class)) {
            return false;
        }

        app(ContractService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        $rules = [
            'room_id' => ['bail', 'required', new NotBoolean, 'integer', 'min:1', Rule::exists(Room::class, 'id')],
            'user_id' => ['bail', 'required', new NotBoolean, 'integer', 'min:1', Rule::exists(User::class, 'id')],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after:start_date'],
            'monthly_rent' => ['required', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991'],
            'deposit_amount' => ['required', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991'],
            'occupant_count' => ['required', new NotBoolean, 'integer', 'between:1,65535'],
            'note' => ['nullable', 'string', new MaxTextBytes],
        ];
        foreach ([
            'id', 'status', 'contract_number', 'actual_end_date', 'activated_at', 'closed_at',
            'deposit_status', 'deposit_paid_at', 'deposit_deducted_amount', 'deposit_refund_amount', 'deposit_settled_at',
            'initial_electricity_reading', 'initial_water_reading', 'meter_gap_reason', 'meter_gap_confirmed_by',
            'active_room_id', 'active_tenant_id', 'renewed_from_id', 'closure_reason', 'closure_note',
            'room', 'user', 'tenant', 'services', 'service_ids', 'contract_services', 'occupants', 'contract_occupants', 'attachments',
            'termination_fee_type', 'termination_fee_amount', 'termination_fee_multiplier', 'waiver_conditions',
            'early_termination_fee_type', 'early_termination_fee_amount', 'early_termination_fee_multiplier',
            'early_termination_waiver_terms', 'early_termination_waiver_conditions', 'early_termination_waiver_code',
            'early_termination_waived_by', 'early_termination_waived_at', 'early_termination_waiver_note',
            'inspection_result', 'inspected_by', 'inspected_at', 'inspection_note',
            'role', 'password', 'created_at', 'updated_at', 'deleted_at',
        ] as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute là bắt buộc.',
            'integer' => ':attribute phải là số nguyên.',
            'min' => ':attribute phải từ :min trở lên.',
            'max' => ':attribute không được vượt quá :max.',
            'between' => ':attribute phải nằm trong khoảng :min đến :max.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'date_format' => ':attribute phải là ngày hợp lệ theo định dạng YYYY-MM-DD.',
            'end_date.after' => 'Ngày cuối được ở phải sau ngày bắt đầu.',
            'room_id.exists' => 'Phòng không tồn tại.',
            'user_id.exists' => 'Tài khoản người thuê không tồn tại.',
            'missing' => 'Không được gửi trường :attribute trong thao tác này.',
        ];
    }

    public function attributes(): array
    {
        return [
            'room_id' => 'Phòng', 'user_id' => 'Người thuê', 'start_date' => 'Ngày bắt đầu',
            'end_date' => 'Ngày cuối được ở', 'monthly_rent' => 'Tiền thuê tháng',
            'deposit_amount' => 'Tiền cọc', 'occupant_count' => 'Số người ở', 'note' => 'Ghi chú',
        ];
    }
}
