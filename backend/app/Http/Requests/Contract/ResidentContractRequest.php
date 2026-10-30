<?php

namespace App\Http\Requests\Contract;

use App\Models\Contract;
use App\Rules\NotBoolean;
use App\Services\ResidentContractService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ResidentContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewOwnContracts', Contract::class)) {
            return false;
        }
        app(ResidentContractService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        $rules = $this->route()->getActionMethod() === 'index' ? [
            'status' => ['sometimes', Rule::in(['active', 'terminated', 'expired'])],
            'page' => ['sometimes', new NotBoolean, 'integer', 'min:1', 'max:2147483647'],
        ] : [];
        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return ['in' => 'Trạng thái hợp đồng không hợp lệ.', 'integer' => 'Trang phải là số nguyên.',
            'min' => 'Trang phải từ 1 trở lên.', 'max' => 'Trang vượt giới hạn hỗ trợ.', 'missing' => 'Không được gửi trường :attribute.'];
    }
}
