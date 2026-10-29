<?php

namespace App\Http\Requests\Debt;

use App\Models\Invoice;
use App\Rules\NotBoolean;
use App\Services\DebtService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class DebtRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewDebts', Invoice::class)) {
            return false;
        }

        app(DebtService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        $id = ['bail', new NotBoolean, 'integer', 'min:1', 'max:2147483647'];
        $rules = [
            'status' => ['sometimes', Rule::in(['all', 'overdue', 'not_due'])],
            'search' => ['sometimes', 'string', 'max:100'],
            'page' => ['sometimes', ...$id],
        ];

        foreach (array_diff(array_keys($this->all()), array_keys($rules)) as $field) {
            $rules[$field] = ['missing'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'in' => ':attribute không hợp lệ.',
            'string' => ':attribute phải là chuỗi.',
            'max' => ':attribute vượt giới hạn :max.',
            'integer' => ':attribute phải là số nguyên.',
            'min' => ':attribute phải từ :min trở lên.',
            'missing' => 'Không được gửi trường :attribute.',
        ];
    }

    public function attributes(): array
    {
        return ['status' => 'Trạng thái công nợ', 'search' => 'Từ khóa', 'page' => 'Trang'];
    }
}
