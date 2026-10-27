import { useRef, useState, type FormEvent } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { saveContractTerms } from './api'
import { contractTermsSchema, type ContractTermsInput } from './schemas'
import type { Contract } from './types'

const labels = { none: 'Không thu phí trước hạn', fixed: 'Số tiền cố định', rent_multiple: 'Hệ số nhân tiền thuê tháng' }
export function ContractTermsPanel({ contract, onSaved, onReload, onBusy, onAuthFailure }: { contract: Contract; onSaved: (contract: Contract) => void; onReload: () => void; onBusy: (busy: boolean) => void; onAuthFailure: () => void }) {
  const defaults = (): ContractTermsInput => ({ early_termination_fee_type: contract.early_termination_fee_type ?? '', early_termination_fee_amount: contract.early_termination_fee_amount ?? null,
    early_termination_fee_multiplier: contract.early_termination_fee_multiplier ?? null, early_termination_waiver_conditions: contract.early_termination_waiver_conditions ?? [] })
  const { register, control, handleSubmit, setValue, reset, setError, formState: { errors, isSubmitting } } = useForm<ContractTermsInput>({ resolver: zodResolver(contractTermsSchema), defaultValues: defaults() })
  const { fields, append, remove } = useFieldArray({ control, name: 'early_termination_waiver_conditions' })
  const type = useWatch({ control, name: 'early_termination_fee_type' })
  const flight = useRef(false)
  const [success, setSuccess] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (flight.current) { event.preventDefault(); return }
    flight.current = true
    try { await handleSubmit(async input => {
      onBusy(true)
      setSuccess('')
      try { const updated = await saveContractTerms(contract.id, input); onSaved(updated); reset({ ...input, early_termination_fee_amount: updated.early_termination_fee_amount, early_termination_fee_multiplier: updated.early_termination_fee_multiplier }); setSuccess('Đã lưu điều khoản thỏa thuận.') }
      catch (failure) { applyApiErrors(failure, setError, ['early_termination_fee_type', 'early_termination_fee_amount', 'early_termination_fee_multiplier', 'early_termination_waiver_conditions', ...fields.flatMap((_, index) => [`early_termination_waiver_conditions.${index}.code`, `early_termination_waiver_conditions.${index}.description`])]); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure() }
    })(event) } finally { flight.current = false; onBusy(false) }
  }
  if (contract.status !== 'draft') return <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3"><h2 className="font-bold">Điều khoản đã ký — chỉ đọc</h2><p>{contract.early_termination_fee_type ? labels[contract.early_termination_fee_type] : 'Chưa có snapshot điều khoản'}</p>{contract.early_termination_fee_type === 'fixed' && <p>{contract.early_termination_fee_amount === null ? 'Chưa có số tiền snapshot' : formatVND(contract.early_termination_fee_amount)}</p>}{contract.early_termination_fee_type === 'rent_multiple' && <p>Hệ số {contract.early_termination_fee_multiplier}</p>}<ul className="space-y-2">{contract.early_termination_waiver_conditions?.map(item => <li key={item.code} className="break-words">{item.code}: {item.description}</li>)}</ul><p className="text-sm text-slate-500">MVP chỉ miễn toàn bộ theo điều kiện đã ký và xác nhận hợp lệ khi thanh lý.</p></section>
  return <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
    <h2 className="font-bold">Điều khoản phí trước hạn</h2><p className="text-sm text-slate-600">Chỉ nhập điều khoản đã thỏa thuận. Không mặc định phát sinh phí; điều khoản được khóa khi kích hoạt.</p>
    <fieldset disabled={isSubmitting} className="space-y-4"><legend className="sr-only">Điều khoản thỏa thuận</legend>
      <label className="block text-sm font-semibold">Loại phí<select {...register('early_termination_fee_type', { onChange: () => { setValue('early_termination_fee_amount', null); setValue('early_termination_fee_multiplier', null); setSuccess('') } })} className="mt-2 w-full rounded-xl border border-slate-200 p-3"><option value="">Chưa thỏa thuận — chưa thể kích hoạt</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {type === 'fixed' && <label className="block text-sm font-semibold">Số tiền phí (VND)<input type="number" min="0" step="1" {...register('early_termination_fee_amount', { setValueAs: value => value === '' ? null : Number(value) })} className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label>}
      {type === 'rent_multiple' && <label className="block text-sm font-semibold">Hệ số tiền thuê<input inputMode="decimal" {...register('early_termination_fee_multiplier')} className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label>}
      {[errors.early_termination_fee_type, errors.early_termination_fee_amount, errors.early_termination_fee_multiplier].map((error, index) => error && <p key={index} role="alert" className="text-sm text-rose-700">{error.message}</p>)}
      <h3 className="text-sm font-bold">Điều kiện miễn toàn bộ đã thỏa thuận</h3>{fields.map((field, index) => <div key={field.id} className="space-y-2 rounded-2xl border border-slate-200 p-4"><label className="block text-sm">Mã điều kiện {index + 1}<input {...register(`early_termination_waiver_conditions.${index}.code`)} className="mt-1 w-full rounded-xl border border-slate-200 p-2" /></label><label className="block text-sm">Nội dung điều kiện {index + 1}<textarea {...register(`early_termination_waiver_conditions.${index}.description`)} className="mt-1 w-full rounded-xl border border-slate-200 p-2" /></label>{errors.early_termination_waiver_conditions?.[index]?.code && <p role="alert" className="text-sm text-rose-700">{errors.early_termination_waiver_conditions[index]?.code?.message}</p>}{errors.early_termination_waiver_conditions?.[index]?.description && <p role="alert" className="text-sm text-rose-700">{errors.early_termination_waiver_conditions[index]?.description?.message}</p>}<Button type="button" variant="ghost" onClick={() => remove(index)}>Bỏ điều kiện {index + 1}</Button></div>)}
      <Button type="button" variant="outline" onClick={() => append({ code: '', description: '' })}>Thêm điều kiện miễn</Button>
    </fieldset>
    {(errors.early_termination_waiver_conditions?.root?.message ?? errors.early_termination_waiver_conditions?.message) && <p role="alert" className="text-sm text-rose-700">{errors.early_termination_waiver_conditions?.root?.message ?? errors.early_termination_waiver_conditions?.message}</p>}{errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}{success && <p role="status" className="text-sm text-teal-700">{success}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" isLoading={isSubmitting}>Lưu điều khoản</Button><Button type="button" variant="outline" disabled={isSubmitting} onClick={onReload}>Tải lại dữ liệu</Button></div>
  </form>
}
