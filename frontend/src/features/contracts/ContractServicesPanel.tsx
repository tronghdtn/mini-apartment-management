import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { businessToday, formatDate, formatServicePeriod, formatVND } from '@/lib/format'
import { getContractServiceOptions, saveDraftContractServices } from './api'
import { draftContractServicesSchema } from './schemas'
import { inactiveServiceQuantityError } from './serviceChanges'
import type { DraftContractServicesInput } from './schemas'
import { serviceChangeEffectiveDate, type Contract, type ContractBillingType, type ContractServiceOption } from './types'

const labels: Record<ContractBillingType, string> = { per_room: 'Theo phòng', per_person: 'Theo người', per_unit: 'Theo số lượng', metered: 'Theo chỉ số' }
/** Nháp: mọi dòng định kỳ. Hiệu lực: các dòng còn hiệu lực tại ngày áp dụng (lịch sử đã đóng không đưa vào form). */
const selectedServices = (contract: Contract, effective?: string) => ({ services: (contract.contract_services ?? [])
  .filter(line => line.service.billing_type !== 'metered' && (!effective || (line.start_date <= effective && (line.end_date === null || line.end_date >= effective))))
  .map(line => ({ service_id: line.service_id, quantity: Number(line.quantity) })) })

function DraftServicesForm({ contract, options, onSaved, onReload, onBusy, effective }: {
  contract: Contract; options: ContractServiceOption[]; onSaved: (contract: Contract) => void; onReload: () => void; onBusy?: (busy: boolean) => void; effective?: string
}) {
  const active = effective !== undefined
  const { control, register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<DraftContractServicesInput>({
    resolver: zodResolver(draftContractServicesSchema), defaultValues: selectedServices(contract, effective),
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'services' })
  const values = useWatch({ control, name: 'services' })
  const inFlight = useRef(false)
  const [success, setSuccess] = useState('')
  const savedLines = (contract.contract_services ?? []).filter(line => !active || line.end_date === null || line.end_date >= (effective ?? ''))
  // Dịch vụ ngừng hoạt động đã lưu vẫn phải thấy để có thể bỏ chọn, không biến mất âm thầm.
  const merged = new Map(options.map(option => [option.id, option]))
  for (const line of savedLines) if (!merged.has(line.service_id)) merged.set(line.service_id, { ...line.service, id: line.service_id, price: line.unit_price })
  const selectable = [...merged.values()].filter(option => option.billing_type !== 'metered'
    && !['ELECTRICITY', 'WATER'].includes(option.code) && (option.status === 'active' || values.some(value => value.service_id === option.id)))
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (inFlight.current) { event.preventDefault(); return }
    inFlight.current = true
    try {
      await handleSubmit(async input => {
        if (active) {
          let invalid = false
          input.services.forEach((value, index) => {
            const option = merged.get(value.service_id)
            const saved = savedLines.find(line => line.service_id === value.service_id)
            const message = option && inactiveServiceQuantityError(option.status, saved?.quantity, value.quantity)
            if (message) { setError(`services.${index}.quantity`, { message }); invalid = true }
          })
          if (invalid) return
        }
        onBusy?.(true)
        setSuccess('')
        try {
          const updated = await saveDraftContractServices(contract.id, input, active ? contract.lifecycle_revision ?? '' : undefined)
          onSaved(updated); reset(selectedServices(updated, effective))
          setSuccess(active ? `Đã ghi thay đổi dịch vụ, áp dụng từ ${formatDate(effective ?? '')}.` : 'Đã lưu dịch vụ hợp đồng.')
        } catch (failure) {
          const paths = ['services', ...input.services.flatMap((_, index) => [`services.${index}.service_id`, `services.${index}.quantity`])]
          applyApiErrors(failure, setError, paths)
        }
      })(event)
    } finally { inFlight.current = false; onBusy?.(false) }
  }
  return <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="space-y-4 border-t border-slate-100 pt-5">
    {active && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Áp dụng từ {formatDate(effective ?? '')} (tháng sau). Hóa đơn đã phát hành không thay đổi. Điện/Nước không đổi tại đây.</p>}
    <p className="text-xs text-slate-500">Đơn giá do hệ thống lấy từ danh mục khi thêm mới. Dòng đã lưu giữ nguyên giá; thay số người ở không tự đổi số lượng dịch vụ.</p>
    <fieldset disabled={isSubmitting} className="min-w-0 space-y-3"><legend className="text-sm font-bold text-slate-800 mb-3">{active ? 'Dịch vụ định kỳ từ ngày áp dụng' : 'Chọn dịch vụ định kỳ cho bản nháp'}</legend>
      {selectable.length === 0 && <p className="text-sm text-slate-500">Chưa có dịch vụ định kỳ đang hoạt động để chọn.</p>}
      {selectable.map(option => {
        const index = values.findIndex(value => value.service_id === option.id)
        const saved = savedLines.find(line => line.service_id === option.id)
        const price = saved ? saved.unit_price : option.price
        const fieldError = index < 0 ? undefined : errors.services?.[index]
        return <div key={option.id} className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <label className="flex items-start gap-3"><input type="checkbox" className="accent-sky-600 mt-1" checked={index >= 0}
            onChange={event => { setSuccess(''); if (event.target.checked) append({ service_id: option.id, quantity: option.billing_type === 'per_person' ? contract.occupant_count : 1 }); else remove(index) }} />
            <span className="min-w-0 text-sm"><span className="font-bold text-slate-800 break-words">{option.name}</span> <span className="text-slate-500">· {labels[option.billing_type]}</span>
              {option.status === 'inactive' && <><Badge tone="slate">Ngừng hoạt động</Badge><span className="block text-xs text-slate-500 mt-1">{active ? 'Được giữ nguyên, giảm số lượng hoặc ngừng.' : 'Bỏ chọn trước khi lưu.'}</span></>}
              <span className="block text-xs text-slate-500 mt-1">{saved ? 'Giá đã lưu' : 'Giá danh mục'}: {price === null ? 'Chưa có giá' : formatVND(price)}{option.unit ? ` / ${option.unit}` : ''}</span></span>
          </label>
          {index >= 0 && <div className="sm:max-w-xs"><label htmlFor={`service-quantity-${option.id}`} className="text-xs font-semibold text-slate-600">Số lượng {option.name}</label>
            <input key={fields[index]?.id} id={`service-quantity-${option.id}`} type="number" min={1} max={active && option.status === 'inactive' && saved ? Number(saved.quantity) : 99999999} step={1} readOnly={option.billing_type === 'per_room'}
              aria-invalid={Boolean(fieldError?.quantity)} {...register(`services.${index}.quantity`, { valueAsNumber: true })}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm read-only:bg-slate-50" />
            {fieldError?.quantity && <p role="alert" className="text-xs text-rose-700 mt-1">{fieldError.quantity.message}</p>}
            {fieldError?.service_id && <p role="alert" className="text-xs text-rose-700 mt-1">{fieldError.service_id.message}</p>}
          </div>}
        </div>
      })}
    </fieldset>
    {errors.services?.message && <p role="alert" className="text-sm text-rose-700">{errors.services.message}</p>}
    {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}
    {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" isLoading={isSubmitting}>{active ? 'Xác nhận thay đổi' : 'Lưu dịch vụ'}</Button><Button type="button" variant="outline" disabled={isSubmitting} onClick={() => { reset(selectedServices(contract, effective)); setSuccess('') }}>Hủy thay đổi</Button><Button type="button" variant="ghost" disabled={isSubmitting} onClick={onReload}>Tải lại dịch vụ</Button></div>
  </form>
}

export function ContractServicesPanel({ contract, onSaved, onReload, onBusy }: { contract: Contract; onSaved: (contract: Contract) => void; onReload: () => void; onBusy?: (busy: boolean) => void }) {
  const [revision, setRevision] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; options: ContractServiceOption[]; error: string }>()
  const [changing, setChanging] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const key = `${contract.id}:${revision}`
  const changeable = contract.status === 'active' && contract.actual_end_date === null
  const effective = serviceChangeEffectiveDate(contract, businessToday())
  const needsOptions = contract.status === 'draft' || (changeable && changing)
  useEffect(() => {
    if (!needsOptions) return
    const abort = new AbortController()
    getContractServiceOptions(abort.signal).then(options => { if (!abort.signal.aborted) setLoaded({ key, options, error: '' }) })
      .catch(failure => { if (!abort.signal.aborted) setLoaded({ key, options: [], error: apiErrorMessage(failure) }) })
    return () => abort.abort()
  }, [key, needsOptions])
  const markBusy = (value: boolean) => { setBusy(value); onBusy?.(value) }
  const optionsState = !loaded || loaded.key !== key ? <p role="status" className="text-sm text-slate-500">Đang tải danh mục dịch vụ…</p>
    : loaded.error ? <div role="alert" className="space-y-3 text-sm text-rose-700"><p>{loaded.error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Tải lại dịch vụ</Button></div> : null
  return <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5" aria-label="Dịch vụ hợp đồng">
    <h2 className="font-bold text-base text-slate-900">Dịch vụ hợp đồng</h2>
    <p className="text-sm text-sky-800 rounded-2xl border border-sky-100 bg-sky-50 p-4">{contract.status === 'draft' ? 'Điện và Nước tự động được thêm khi kích hoạt, tính theo chỉ số thực tế. Lưu nháp chưa phát sinh hóa đơn.' : 'Điện và Nước tính theo chỉ số thực tế. Kích hoạt không tạo hóa đơn; đơn giá được xác định khi ghi chỉ số.'}</p>
    {(contract.contract_services ?? []).length === 0 ? <p className="text-sm text-slate-500">Chưa có dịch vụ được lưu cho hợp đồng.</p> : <div className="overflow-x-auto"><table className="min-w-[640px] w-full text-sm"><thead><tr className="text-left text-xs text-slate-500 border-b border-slate-200"><th className="py-3 pr-4">Dịch vụ</th><th className="py-3 pr-4">Số lượng</th><th className="py-3 pr-4">Đơn giá đã lưu</th><th className="py-3">Khoảng hiệu lực</th></tr></thead><tbody>{contract.contract_services?.map(line => <tr key={line.id} className="border-b border-slate-100"><td className="py-3 pr-4 break-words">{line.service.name}<span className="block text-xs text-slate-500">{labels[line.service.billing_type]}</span>{line.service.status === 'inactive' && <Badge tone="slate">Ngừng hoạt động</Badge>}</td><td className="py-3 pr-4 font-mono">{line.quantity}</td><td className="py-3 pr-4">{line.unit_price === null ? 'Theo bảng giá điện nước' : formatVND(line.unit_price)}</td><td className="py-3">{formatServicePeriod(line.start_date, line.end_date, '→')}</td></tr>)}</tbody></table></div>}
    {contract.status === 'draft' ? optionsState ?? (loaded && <DraftServicesForm key={key} contract={contract} options={loaded.options} onSaved={onSaved} onReload={onReload} onBusy={onBusy} />)
      : changeable ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><p className="text-xs text-slate-500">Dòng đã lưu và đơn giá snapshot không bị sửa ngược. Thay đổi mới áp dụng từ {formatDate(effective)}.</p><Button onClick={() => { setNotice(''); setChanging(true) }}>Thay đổi dịch vụ</Button></div>
      : <p className="text-xs text-slate-500">Các dòng và đơn giá đã lưu chỉ đọc{contract.status === 'active' ? '; hợp đồng đang bàn giao nên không thay dịch vụ.' : '.'}</p>}
    {notice && <p role="status" className="text-sm font-semibold text-emerald-700">{notice}</p>}
    <Modal isOpen={changing} onClose={() => { if (!busy) setChanging(false) }} title="Thay đổi dịch vụ hợp đồng" maxWidth="lg">
      {changing && (optionsState ?? (loaded && <DraftServicesForm key={`${key}:${contract.lifecycle_revision}`} contract={contract} options={loaded.options} effective={effective}
        onSaved={updated => { onSaved(updated); setChanging(false); setNotice(`Đã ghi thay đổi dịch vụ, áp dụng từ ${formatDate(effective)}. Các kỳ trước giữ nguyên.`) }} onReload={() => { setChanging(false); onReload() }} onBusy={markBusy} />))}
    </Modal>
  </section>
}
