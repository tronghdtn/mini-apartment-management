<?php

namespace App\Http\Requests\ResidentOverview;

use App\Models\Contract;
use App\Services\ResidentOverviewService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class ResidentOverviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! Gate::allows('viewOwnContracts', Contract::class)) {
            return false;
        }
        app(ResidentOverviewService::class)->ensureReady();

        return true;
    }

    public function rules(): array
    {
        return array_fill_keys(array_keys($this->all()), ['missing']);
    }

    public function messages(): array
    {
        return ['missing' => 'Tổng quan cư dân không nhận tham số :attribute.'];
    }
}
