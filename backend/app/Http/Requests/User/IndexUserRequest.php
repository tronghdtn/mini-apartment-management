<?php

namespace App\Http\Requests\User;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Rules\NotBoolean;
use App\Services\AdminUserService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class IndexUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewAny', User::class)) {
            return false;
        }

        app(AdminUserService::class)->ensureReady();

        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('q'))) {
            $this->merge(['q' => trim($this->input('q'))]);
        }
    }

    public function rules(): array
    {
        return [
            'role' => ['sometimes', Rule::enum(UserRole::class)],
            'status' => ['sometimes', Rule::enum(UserStatus::class)],
            'has_active_contract' => ['sometimes', new NotBoolean, 'integer', Rule::in([0, 1])],
            'q' => ['nullable', 'string', 'max:191'],
            'page' => ['sometimes', new NotBoolean, 'integer', 'between:1,2147483647'],
        ];
    }

    public function messages(): array
    {
        return [
            'role.enum' => 'Vai trò tài khoản không hợp lệ.',
            'status.enum' => 'Trạng thái tài khoản không hợp lệ.',
            'has_active_contract.integer' => 'Bộ lọc đang thuê chỉ nhận 0 hoặc 1.',
            'has_active_contract.in' => 'Bộ lọc đang thuê chỉ nhận 0 hoặc 1.',
            'q.string' => 'Từ khóa tìm kiếm phải là chuỗi ký tự.',
            'q.max' => 'Từ khóa tìm kiếm không được vượt quá 191 ký tự.',
            'page.integer' => 'Trang phải là số nguyên.',
            'page.between' => 'Trang phải nằm trong khoảng 1 đến 2147483647.',
        ];
    }
}
