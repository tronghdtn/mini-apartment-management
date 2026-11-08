import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { CheckCircle2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { saveContractTerms } from './api'
import { contractTermsSchema, type ContractTermsInput } from './schemas'
import { earlyTerminationFeeLabels as labels, type Contract } from './types'

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition'

export function ContractTermsPanel({
  contract,
  onSaved,
  onReload,
  onBusy,
  onAuthFailure,
}: {
  contract: Contract
  onSaved: (contract: Contract) => void
  onReload: () => void
  onBusy: (busy: boolean) => void
  onAuthFailure: () => void
}) {
  const defaults = (): ContractTermsInput => ({
    early_termination_fee_type: contract.early_termination_fee_type ?? 'none',
    early_termination_fee_amount: contract.early_termination_fee_amount ?? null,
    early_termination_fee_multiplier: contract.early_termination_fee_multiplier ?? null,
    early_termination_waiver_conditions: contract.early_termination_waiver_conditions ?? [],
  })

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContractTermsInput>({
    resolver: zodResolver(contractTermsSchema),
    defaultValues: defaults(),
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'early_termination_waiver_conditions',
  })
  const type = useWatch({ control, name: 'early_termination_fee_type' })
  const flight = useRef(false)
  const [success, setSuccess] = useState('')

  // Khi chọn "Không thu phí trước hạn", tự động dọn các dòng điều kiện miễn rỗng để không chặn nút Lưu
  useEffect(() => {
    if (type === 'none' || type === '') {
      replace([])
    }
  }, [type, replace])

  function applyPreset(preset: 'none' | 'one_month' | 'deposit') {
    setSuccess('')
    if (preset === 'none') {
      setValue('early_termination_fee_type', 'none', { shouldValidate: true })
      setValue('early_termination_fee_amount', null)
      setValue('early_termination_fee_multiplier', null)
      replace([])
    } else if (preset === 'one_month') {
      setValue('early_termination_fee_type', 'rent_multiple', { shouldValidate: true })
      setValue('early_termination_fee_amount', null)
      setValue('early_termination_fee_multiplier', '1', { shouldValidate: true })
    } else {
      setValue('early_termination_fee_type', 'fixed', { shouldValidate: true })
      setValue('early_termination_fee_amount', contract.deposit_amount || contract.monthly_rent, { shouldValidate: true })
      setValue('early_termination_fee_multiplier', null)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (flight.current) {
      event.preventDefault()
      return
    }
    flight.current = true
    try {
      await handleSubmit(async (input) => {
        onBusy(true)
        setSuccess('')
        const cleanedWaivers =
          input.early_termination_fee_type === 'none'
            ? []
            : (input.early_termination_waiver_conditions ?? []).filter(
                (item) => item.code.trim() !== '' || item.description.trim() !== '',
              )
        const payload: ContractTermsInput = {
          ...input,
          early_termination_waiver_conditions: cleanedWaivers,
        }
        try {
          const updated = await saveContractTerms(contract.id, payload)
          onSaved(updated)
          reset({
            ...payload,
            early_termination_fee_amount: updated.early_termination_fee_amount,
            early_termination_fee_multiplier: updated.early_termination_fee_multiplier,
          })
          setSuccess('Đã lưu điều khoản thỏa thuận thành công!')
        } catch (failure) {
          applyApiErrors(failure, setError, [
            'early_termination_fee_type',
            'early_termination_fee_amount',
            'early_termination_fee_multiplier',
            'early_termination_waiver_conditions',
            ...fields.flatMap((_, index) => [
              `early_termination_waiver_conditions.${index}.code`,
              `early_termination_waiver_conditions.${index}.description`,
            ]),
          ])
          if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
        }
      })(event)
    } finally {
      flight.current = false
      onBusy(false)
    }
  }

  if (contract.status !== 'draft') {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="font-bold text-slate-900">Điều khoản đã ký — chỉ đọc</h2>
        <p className="text-sm text-slate-700 font-semibold">
          {contract.early_termination_fee_type ? labels[contract.early_termination_fee_type] : 'Chưa có snapshot điều khoản'}
        </p>
        {contract.early_termination_fee_type === 'fixed' && (
          <p className="text-sm text-sky-700 font-bold">
            {contract.early_termination_fee_amount === null ? 'Chưa có số tiền snapshot' : formatVND(contract.early_termination_fee_amount)}
          </p>
        )}
        {contract.early_termination_fee_type === 'rent_multiple' && (
          <p className="text-sm text-sky-700 font-bold">Hệ số {contract.early_termination_fee_multiplier} tháng tiền thuê</p>
        )}
        {!!contract.early_termination_waiver_conditions?.length && (
          <ul className="space-y-2 text-sm text-slate-700">
            {contract.early_termination_waiver_conditions.map((item) => (
              <li key={item.code} className="break-words rounded-xl bg-slate-50 p-3 border border-slate-200">
                <strong className="font-mono text-xs text-sky-700">{item.code}</strong>: {item.description}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">Điều khoản được khóa sau khi kích hoạt hợp đồng.</p>
      </section>
    )
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="rounded-3xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-bold text-base text-slate-900">Điều khoản chấm dứt hợp đồng trước hạn</h2>
          <p className="text-xs text-slate-500 mt-1">
            Chọn mẫu điều khoản nhanh bên dưới và bấm <strong>Lưu điều khoản</strong>. Mặc định hệ thống áp dụng <em>Không thu phí trước hạn</em>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" /> Chọn nhanh:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('none')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              type === 'none'
                ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Không thu phí trước hạn
          </button>
          <button
            type="button"
            onClick={() => applyPreset('one_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              type === 'rent_multiple'
                ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Phạt 1 tháng tiền thuê
          </button>
          <button
            type="button"
            onClick={() => applyPreset('deposit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              type === 'fixed'
                ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Phạt bằng tiền cọc ({formatVND(contract.deposit_amount || contract.monthly_rent)})
          </button>
        </div>
      </div>

      <fieldset disabled={isSubmitting} className="space-y-4">
        <legend className="sr-only">Điều khoản thỏa thuận</legend>
        <div>
          <label htmlFor="terms-fee-type" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Loại phí trả phòng trước hạn
          </label>
          <select
            id="terms-fee-type"
            {...register('early_termination_fee_type', {
              onChange: (e) => {
                const nextType = e.target.value
                setValue('early_termination_fee_amount', nextType === 'fixed' ? contract.deposit_amount || contract.monthly_rent : null)
                setValue('early_termination_fee_multiplier', nextType === 'rent_multiple' ? '1' : null)
                if (nextType === 'none' || nextType === '') replace([])
                setSuccess('')
              },
            })}
            className={inputClass}
          >
            <option value="">-- Chọn loại điều khoản --</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {type === 'none' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3 text-xs sm:text-sm text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Không thu phí trước hạn:</strong> Khách thuê trả phòng sớm sẽ không bị tính phí phạt chấm dứt trước hạn (không cần khai báo thêm điều kiện miễn).
            </span>
          </div>
        )}

        {type === 'fixed' && (
          <div>
            <label htmlFor="terms-fee-amount" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Số tiền phí phạt cố định (VND) <span className="text-rose-500">*</span>
            </label>
            <input
              id="terms-fee-amount"
              type="number"
              min="0"
              step="100000"
              placeholder="VD: 4500000"
              {...register('early_termination_fee_amount', {
                setValueAs: (value) => (value === '' ? null : Number(value)),
              })}
              className={inputClass}
            />
          </div>
        )}

        {type === 'rent_multiple' && (
          <div>
            <label htmlFor="terms-fee-multiplier" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Hệ số tháng tiền thuê <span className="text-rose-500">*</span>
            </label>
            <input
              id="terms-fee-multiplier"
              inputMode="decimal"
              placeholder="VD: 1 (tương đương 1 tháng tiền phòng)"
              {...register('early_termination_fee_multiplier')}
              className={inputClass}
            />
          </div>
        )}

        {[errors.early_termination_fee_type, errors.early_termination_fee_amount, errors.early_termination_fee_multiplier].map(
          (error, index) =>
            error && (
              <p key={index} role="alert" className="text-sm text-rose-700">
                {error.message}
              </p>
            ),
        )}

        {(type === 'fixed' || type === 'rent_multiple') && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Điều kiện miễn phí phạt (tùy chọn)</h3>
                <p className="text-xs text-slate-500">Các trường hợp cư dân được miễn phí trả phòng trước hạn nếu có minh chứng.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() =>
                    append({
                      code: `BAO_TRUOC_30N_${fields.length + 1}`,
                      description: 'Cư dân thông báo trước bằng văn bản tối thiểu 30 ngày trước ngày bàn giao.',
                    })
                  }
                >
                  + Mẫu: Báo trước 30 ngày
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ code: '', description: '' })}
                >
                  Thêm điều kiện tự nhập
                </Button>
              </div>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">Điều kiện miễn #{index + 1}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                    onClick={() => remove(index)}
                    className="text-rose-600"
                  >
                    Bỏ điều kiện {index + 1}
                  </Button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Mã điều kiện {index + 1}
                    <input
                      placeholder="VD: BAO_TRUOC_30_NGAY"
                      {...register(`early_termination_waiver_conditions.${index}.code`)}
                      className={inputClass}
                    />
                  </label>
                  {errors.early_termination_waiver_conditions?.[index]?.code && (
                    <p role="alert" className="text-xs text-rose-700 mt-1">
                      {errors.early_termination_waiver_conditions[index]?.code?.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nội dung điều kiện {index + 1}
                    <textarea
                      rows={2}
                      placeholder="VD: Miễn phí phạt nếu cư dân báo trước tối thiểu 30 ngày..."
                      {...register(`early_termination_waiver_conditions.${index}.description`)}
                      className={inputClass}
                    />
                  </label>
                  {errors.early_termination_waiver_conditions?.[index]?.description && (
                    <p role="alert" className="text-xs text-rose-700 mt-1">
                      {errors.early_termination_waiver_conditions[index]?.description?.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {(errors.early_termination_waiver_conditions?.root?.message ?? errors.early_termination_waiver_conditions?.message) && (
        <p role="alert" className="text-sm text-rose-700">
          {errors.early_termination_waiver_conditions?.root?.message ?? errors.early_termination_waiver_conditions?.message}
        </p>
      )}
      {errors.root && (
        <p role="alert" className="text-sm text-rose-700">
          {errors.root.message}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm font-semibold text-emerald-700">
          {success}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
        <Button type="submit" isLoading={isSubmitting}>
          Lưu điều khoản
        </Button>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onReload}>
          Tải lại dữ liệu
        </Button>
      </div>
    </form>
  )
}
