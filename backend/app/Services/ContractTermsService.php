<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Enums\DepositStatus;
use App\Enums\EarlyTerminationFeeType;
use App\Models\Contract;
use App\Models\User;
use App\Rules\NotBoolean;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/** Signed P4/P5-B snapshots; saving terms never activates or closes a contract. */
class ContractTermsService
{
    public const SNAPSHOT_FIELDS = [
        'early_termination_fee_type', 'early_termination_fee_amount',
        'early_termination_fee_multiplier', 'early_termination_waiver_conditions',
    ];

    /** Only two prerequisites, not a replacement for the full activation transaction. */
    public function assertSignedTermsAndDeposit(Contract $contract): void
    {
        if (! Schema::hasColumns('contracts', self::SNAPSHOT_FIELDS)) {
            abort(503, 'Cấu trúc điều khoản hợp đồng chưa sẵn sàng.');
        }
        if ($contract->early_termination_fee_type === null) {
            throw ValidationException::withMessages(['early_termination_fee_type' => 'Phải chọn rõ điều khoản phí đã thỏa thuận trước khi kích hoạt.']);
        }
        $this->validate([
            'early_termination_fee_type' => $contract->early_termination_fee_type->value,
            'early_termination_fee_amount' => $contract->early_termination_fee_amount,
            'early_termination_fee_multiplier' => $contract->early_termination_fee_multiplier,
            'early_termination_waiver_conditions' => $contract->early_termination_waiver_conditions,
        ]);
        if ($contract->deposit_amount > 0 && ($contract->deposit_status !== DepositStatus::Held || $contract->deposit_paid_at === null)) {
            abort(409, 'Cần xác nhận đã thực nhận đủ tiền cọc trước khi kích hoạt hợp đồng.');
        }
    }

    public function updateDraft(Contract $contract, User $actor, #[\SensitiveParameter] array $input): Contract
    {
        Gate::forUser($actor)->authorize('update', $contract);
        if (! Schema::hasColumns('contracts', self::SNAPSHOT_FIELDS)) {
            abort(503, 'Cấu trúc điều khoản hợp đồng chưa sẵn sàng.');
        }
        $terms = $this->validate($input);

        try {
            return DB::transaction(function () use ($contract, $actor, $terms): Contract {
                $current = Contract::query()->whereKey($contract->id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('update', $current);
                if ($current->status !== ContractStatus::Draft) {
                    abort(409, 'Chỉ được sửa điều khoản của hợp đồng nháp.');
                }
                // Explicit assignments; confirmation/waiver fields never enter a draft update.
                foreach (self::SNAPSHOT_FIELDS as $field) {
                    $current->{$field} = $terms[$field] ?? null;
                }
                $current->save();

                return $current->refresh();
            }, 3);
        } catch (QueryException) {
            // Signed conditions can contain private details; never report SQL or bindings.
            report(new RuntimeException('Lưu điều khoản hợp đồng thất bại do lỗi CSDL.'));
            abort(500, 'Không thể lưu điều khoản hợp đồng lúc này. Vui lòng thử lại sau.');
        }
    }

    private function validate(array $input): array
    {
        if (is_string($input['early_termination_fee_type'] ?? null)) {
            $type = trim($input['early_termination_fee_type']);
            $input['early_termination_fee_type'] = $type === '' ? null : $type;
        }
        $validator = Validator::make($input, [
            'early_termination_fee_type' => ['present', 'nullable', Rule::enum(EarlyTerminationFeeType::class)],
            'early_termination_fee_amount' => [
                'nullable', new NotBoolean, 'integer', 'min:0', 'max:9007199254740991',
                Rule::requiredIf(($input['early_termination_fee_type'] ?? null) === 'fixed'),
            ],
            'early_termination_fee_multiplier' => [
                'nullable', 'string', 'regex:/^\d{1,3}(?:\.\d{1,2})?$/D', 'numeric', 'min:0.01', 'max:999.99',
                Rule::requiredIf(($input['early_termination_fee_type'] ?? null) === 'rent_multiple'),
            ],
            'early_termination_waiver_conditions' => ['nullable', 'array', 'list'],
            'early_termination_waiver_conditions.*' => ['required', 'array:code,description'],
            'early_termination_waiver_conditions.*.code' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9][A-Za-z0-9_-]*$/D', 'distinct:strict'],
            'early_termination_waiver_conditions.*.description' => ['required', 'string', 'not_regex:/^\s*$/u'],
        ], [
            'present' => 'Phải chọn rõ điều khoản phí hoặc để trống khi hợp đồng chưa hoàn chỉnh.',
            'required' => ':attribute không được để trống.',
            'enum' => 'Loại phí trước hạn không hợp lệ.',
            'integer' => ':attribute phải là số nguyên đồng VND.',
            'string' => ':attribute phải là chuỗi ký tự.',
            'numeric' => ':attribute phải là số.',
            'min' => ':attribute phải từ :min trở lên.',
            'max' => ':attribute không được vượt quá :max.',
            'regex' => ':attribute không đúng định dạng.',
            'not_regex' => ':attribute không được chỉ gồm khoảng trắng.',
            'array' => ':attribute phải có đúng cấu trúc được hỗ trợ.',
            'list' => ':attribute phải là danh sách liên tiếp.',
            'distinct' => 'Không được trùng mã điều kiện miễn phí.',
        ], [
            'early_termination_fee_type' => 'Loại phí',
            'early_termination_fee_amount' => 'Số tiền phí',
            'early_termination_fee_multiplier' => 'Hệ số phí',
            'early_termination_waiver_conditions' => 'Điều kiện miễn phí',
            'early_termination_waiver_conditions.*.code' => 'Mã điều kiện',
            'early_termination_waiver_conditions.*.description' => 'Nội dung điều kiện',
        ]);
        $validator->after(function ($validator) use ($input): void {
            foreach (array_diff(array_keys($input), self::SNAPSHOT_FIELDS) as $field) {
                $validator->errors()->add($field, 'Không được cập nhật trường này qua điều khoản nháp.');
            }
            foreach (['early_termination_fee_amount' => 'fixed', 'early_termination_fee_multiplier' => 'rent_multiple'] as $field => $type) {
                if (($input['early_termination_fee_type'] ?? null) !== $type && ($input[$field] ?? null) !== null) {
                    $validator->errors()->add($field, 'Giá trị không phù hợp với loại phí đã chọn.');
                }
            }
        });

        return $validator->validate();
    }
}
