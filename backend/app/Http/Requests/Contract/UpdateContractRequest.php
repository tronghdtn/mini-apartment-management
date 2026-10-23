<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use App\Services\ContractService;
use Illuminate\Support\Facades\Gate;

class UpdateContractRequest extends StoreContractRequest
{
    private Contract $targetContract;

    public function authorize(): bool
    {
        if (! Gate::allows('viewAny', Contract::class)) {
            return false;
        }

        $this->targetContract = app(ContractService::class)->find($this->route('contract'));

        return Gate::allows('update', $this->targetContract);
    }

    public function rules(): array
    {
        $rules = parent::rules();
        foreach (['room_id', 'user_id', 'start_date', 'end_date', 'monthly_rent', 'deposit_amount', 'occupant_count'] as $field) {
            array_unshift($rules[$field], 'sometimes');
        }
        // PATCH chỉ gửi một ngày: so với ngày còn lại đang lưu. Service kiểm tra lại sau khóa.
        $rules['end_date'] = ['sometimes', 'required', 'date_format:Y-m-d'];

        return $rules;
    }
}
