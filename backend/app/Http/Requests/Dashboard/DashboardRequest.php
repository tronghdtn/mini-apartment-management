<?php

namespace App\Http\Requests\Dashboard;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class DashboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isActive() && $this->user()->hasRole(UserRole::Admin);
    }

    public function rules(): array
    {
        return array_fill_keys(array_keys($this->all()), ['missing']);
    }

    public function messages(): array
    {
        return ['missing' => 'Tổng quan hiện không nhận bộ lọc :attribute.'];
    }
}
