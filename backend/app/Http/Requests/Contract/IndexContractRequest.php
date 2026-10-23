<?php

namespace App\Http\Requests\Contract;

use App\Enums\ContractStatus;
use App\Models\Contract;
use App\Rules\NotBoolean;
use App\Services\ContractService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class IndexContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewAny', Contract::class)) {
            return false;
        }

        app(ContractService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::enum(ContractStatus::class)],
            'building_id' => ['sometimes', new NotBoolean, 'integer', 'min:1'],
            'room_id' => ['sometimes', new NotBoolean, 'integer', 'min:1'],
            'user_id' => ['sometimes', new NotBoolean, 'integer', 'min:1'],
            'q' => ['nullable', 'string', 'max:191'],
            'page' => ['sometimes', new NotBoolean, 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'integer' => ':attribute phải là số nguyên.',
            'min' => ':attribute phải từ :min trở lên.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'max' => ':attribute không được vượt quá :max ký tự.',
            'status.enum' => 'Trạng thái hợp đồng không hợp lệ.',
        ];
    }

    public function attributes(): array
    {
        return ['status' => 'Trạng thái', 'building_id' => 'Tòa nhà', 'room_id' => 'Phòng', 'user_id' => 'Người thuê', 'q' => 'Từ khóa', 'page' => 'Trang'];
    }
}
