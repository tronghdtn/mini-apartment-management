import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { isAxiosError } from 'axios'
import { useFieldArray, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, CheckCircle2, Droplets, FileText, Plus, Receipt, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createFinalInvoiceDraft, getContract, previewFinalContractMeters, saveContractInspection } from '@/features/contracts/api'
import { finalMeterPreviewSchema, closureReasonLabels, type FinalMeterPreview, type FinalMeterPreviewInput } from '@/features/contracts/closure'
import { finalInvoiceInputSchema, type FinalInvoiceDraft, type FinalInvoiceInput } from '@/features/contracts/finalInvoice'
import { contractInspectionSchema, type ContractInspectionInput } from '@/features/contracts/inspection'
import type { Contract } from '@/features/contracts/types'
import { ContractSettlementPanel } from '@/features/contracts/ContractSettlementPanel'
import { getLatestFinalInvoice, invoiceAction } from '@/features/invoices/api'
import type { Invoice } from '@/features/invoices/types'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'

export function AdminContractTerminatePage() {
  const { contractId } = useParams<{ contractId: string }>()
  const { refresh } = useAuth()
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{ id: string; contract?: Contract; finalInvoice?: Invoice | null; error?: string }>()
  useEffect(() => {
    const abort = new AbortController()
    getContract(contractId ?? '', abort.signal).then(async contract => {
      // Dev may not yet have the approved pending schema. Keep the existing controlled errors there.
      const finalInvoice = contract.actual_end_date ? await getLatestFinalInvoice(contract.id, abort.signal) : null
      if (!abort.signal.aborted) setResult({ id: `${contractId}:${retry}`, contract, finalInvoice })
    }).catch(failure => {
      if (!abort.signal.aborted) {
        setResult({ id: `${contractId}:${retry}`, error: apiErrorMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
      }
    })
    return () => abort.abort()
  }, [contractId, retry, refresh])
  const current = result?.id === `${contractId}:${retry}` ? result : undefined
  return <div className="space-y-6">
    <header className="border-b border-slate-200 pb-5"><Link to="/admin/contracts" className="text-sm text-sky-700 underline">Hợp đồng</Link>
      <h1 className="mt-3 flex items-center gap-2 text-2xl font-extrabold text-slate-900"><FileText className="h-6 w-6 text-sky-600" />Bàn giao hợp đồng</h1>
      <p className="mt-2 text-sm text-slate-500">Kiểm tra ngày bàn giao và phí theo điều khoản đã ký trước khi quyết toán.</p></header>
    {!current ? <p role="status">Đang tải hợp đồng…</p> : current.error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 p-5"><p>{current.error}</p><Button onClick={() => setRetry(value => value + 1)}>Thử lại</Button></div>
      : current.contract && <><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">{current.contract.contract_number ?? `Hợp đồng #${current.contract.id}`}</h2>
        <p className="mt-2 text-sm">{current.contract.room.building.name} · Phòng {current.contract.room.code} · {current.contract.tenant.full_name}</p>
        <p className="mt-2 text-sm text-slate-600">Ngày nhận: {formatDate(current.contract.start_date)} · Ngày cuối được ở: {formatDate(current.contract.end_date)}</p>
        <Link className="mt-3 inline-block text-sm text-sky-700 underline" to={`/admin/contracts/${current.contract.id}`}>Xem điều khoản hợp đồng</Link></section>
        {current.contract.status === 'terminated' ? <>
          {current.finalInvoice && <Link className="inline-block font-semibold text-sky-700 underline" to={`/admin/invoices/${current.finalInvoice.id}`}>Mở hóa đơn tất toán</Link>}
          <ContractSettlementPanel contractId={current.contract.id} onTerminated={() => setRetry(value => value + 1)} onAuthFailure={() => void refresh()} />
        </> : current.contract.status !== 'active' ? <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">Chỉ xem trước bàn giao cho hợp đồng đang hiệu lực.</p>
          : current.finalInvoice ? <><section role="status" className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <h2 className="font-bold text-teal-950">Đã lưu hóa đơn tất toán #{current.finalInvoice.id}</h2>
            <p className="text-sm text-teal-900">Chỉ số chốt và căn cứ đã được lưu. Mở hóa đơn để kiểm tra, phát hành hoặc lập lại bản đã hủy. Hợp đồng và phòng chưa được thanh lý.</p>
            <Link className="inline-block font-semibold text-sky-700 underline" to={`/admin/invoices/${current.finalInvoice.id}`}>Mở hóa đơn tất toán</Link>
          </section>{['issued', 'partially_paid', 'paid'].includes(current.finalInvoice.status) && <ContractSettlementPanel
            contractId={current.contract.id} onTerminated={() => setRetry(value => value + 1)} onAuthFailure={() => void refresh()} />}</> : <><ClosureForm key={`${current.contract.id}:${current.contract.lifecycle_revision}`} contract={current.contract} onAuthFailure={() => void refresh()} onReload={() => setRetry(value => value + 1)} />
            <InspectionForm key={current.contract.id} contract={current.contract}
              onAuthFailure={() => void refresh()} onSaved={contract => setResult({ id: `${contractId}:${retry}`, contract })} /></>}</>}
  </div>
}

function ClosureForm({ contract, onAuthFailure, onReload }: { contract: Contract; onAuthFailure: () => void; onReload: () => void }) {
  const [busy, setBusy] = useState(false)
  const flight = useRef(false)
  const [result, setResult] = useState<{ key: string; revision: string; data: FinalMeterPreview }>()
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<FinalMeterPreviewInput>({ resolver: zodResolver(finalMeterPreviewSchema), defaultValues: {
    actual_end_date: '', closure_note: '', electricity_reading: '', water_reading: '',
  } })
  const values = useWatch({ control })
  const key = JSON.stringify(values)
  const preview = result?.key === key && result.revision === contract.lifecycle_revision ? result.data : undefined
  async function submit(input: FinalMeterPreviewInput) {
    if (flight.current) return
    flight.current = true; setBusy(true); setResult(undefined)
    try {
      const data = await previewFinalContractMeters(contract.id, input, contract.lifecycle_revision ?? '')
      setResult({ key, revision: contract.lifecycle_revision ?? '', data })
    } catch (failure) {
      applyApiErrors(failure, setError, ['actual_end_date', 'closure_note', 'electricity_reading', 'water_reading'])
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; setBusy(false) }
  }
  return <><form noValidate onSubmit={event => { void handleSubmit(submit)(event) }} className="rounded-2xl border border-slate-200 bg-white p-5"><fieldset disabled={busy} className="space-y-4">
    <h2 className="font-bold text-slate-900">1. Ngày bàn giao và chỉ số chốt</h2>
    <label className="block text-sm font-bold">Ngày bàn giao thực tế<input type="date" {...register('actual_end_date')} min={contract.start_date} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 sm:max-w-xs" />{errors.actual_end_date && <span role="alert" className="mt-1 block text-rose-700">{errors.actual_end_date.message}</span>}</label>
    <label className="block text-sm font-bold">Lý do và ghi chú<textarea {...register('closure_note')} rows={3} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" />{errors.closure_note && <span role="alert" className="mt-1 block text-rose-700">{errors.closure_note.message}</span>}</label>
    <p className="text-sm text-slate-500">Bắt buộc ghi lý do khi nhận–trả cùng ngày, trả trước hạn hoặc quá hạn. Ngày bàn giao không tính tiền phòng cho hợp đồng cũ.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-bold"><span className="inline-flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />Chỉ số điện cuối (kWh)</span>
        <input inputMode="decimal" autoComplete="off" {...register('electricity_reading')} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" placeholder="Ví dụ: 125.00" />
        {errors.electricity_reading && <span role="alert" className="mt-1 block text-rose-700">{errors.electricity_reading.message}</span>}
      </label>
      <label className="block text-sm font-bold"><span className="inline-flex items-center gap-2"><Droplets className="h-4 w-4 text-sky-600" />Chỉ số nước cuối (m³)</span>
        <input inputMode="decimal" autoComplete="off" {...register('water_reading')} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" placeholder="Ví dụ: 13.00" />
        {errors.water_reading && <span role="alert" className="mt-1 block text-rose-700">{errors.water_reading.message}</span>}
      </label>
    </div>
    <p className="text-sm text-slate-500">Giá và mốc trước do hệ thống lấy theo hợp đồng, chuỗi chỉ số và tòa nhà. Số cuối phải được Admin đọc thực tế tại bàn giao.</p>
    {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? 'Đang kiểm tra…' : 'Xem trước bàn giao'}</Button><Button type="button" variant="outline" onClick={onReload}>Tải lại hợp đồng</Button></div></fieldset></form>
    {preview && <section role="status" className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50 p-5"><div><h2 className="font-bold text-teal-900">{closureReasonLabels[preview.closure_reason]}</h2>
      <p className="mt-1 text-sm">Ngày bàn giao đúng hạn: {formatDate(preview.planned_handover_date)} · Kỳ chốt: {formatDate(preview.period)}</p>
      <p className="mt-2 font-bold">Phí chấm dứt trước hạn theo điều khoản: {formatVND(preview.early_termination_fee)}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{preview.readings.map(reading => <article key={reading.service_code} className="rounded-xl border border-teal-100 bg-white p-4">
        <h3 className="font-bold text-slate-900">{reading.service_name}</h3><dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-500">Mốc trước</dt><dd className="text-right tabular-nums">{reading.previous_reading} {reading.unit}</dd>
          <dt className="text-slate-500">Chỉ số cuối</dt><dd className="text-right tabular-nums">{reading.current_reading} {reading.unit}</dd>
          <dt className="text-slate-500">Tiêu thụ</dt><dd className="text-right tabular-nums">{reading.consumption} {reading.unit}</dd>
          <dt className="text-slate-500">Đơn giá</dt><dd className="text-right">{formatVND(reading.unit_price)}/{reading.unit}</dd>
          <dt className="border-t border-slate-100 pt-1 font-semibold">Tạm tính</dt><dd className="border-t border-slate-100 pt-1 text-right font-semibold">{formatVND(reading.amount)}</dd>
        </dl></article>)}</div>
      <p className="font-bold text-teal-950">Tổng điện nước chốt: {formatVND(preview.meter_amount)}</p>
      <p className="text-sm text-slate-700">Bản xem trước chỉ đọc; chưa ghi chỉ số cuối, lập hóa đơn hoặc thanh lý. Khi lập nháp, hệ thống kiểm tra lại chuỗi chỉ số và nguồn tiền.</p></section>}
    {preview && (contract.inspection_result
      ? <FinalInvoiceForm key={result?.key} contract={contract} closure={finalMeterPreviewSchema.parse(values)} preview={preview} onAuthFailure={onAuthFailure} onReload={onReload} />
      : <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Hãy ghi kết quả kiểm tra tài sản trước khi lập hóa đơn tất toán.</p>)}
  </>
}

function FinalInvoiceForm({ contract, closure, preview, onAuthFailure, onReload }: {
  contract: Contract; closure: FinalMeterPreviewInput; preview: FinalMeterPreview; onAuthFailure: () => void; onReload: () => void
}) {
  const [invoice, setInvoice] = useState<FinalInvoiceDraft>()
  const [busy, setBusy] = useState(false)
  const [confirmIssue, setConfirmIssue] = useState(false)
  const [message, setMessage] = useState('')
  const flight = useRef(false)
  const { register, control, setValue, setError, handleSubmit, formState: { errors } } = useForm<FinalInvoiceInput>({
    resolver: zodResolver(finalInvoiceInputSchema),
    defaultValues: { damages: contract.inspection_result === 'damaged' ? [{ description: '', reason: '', basis: '', amount: 1, photos: [] }] : [],
      waiver_code: '', waiver_note: '', waiver_evidence: [] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'damages' })
  const values = useWatch({ control })
  const waiverConditions = contract.early_termination_waiver_conditions ?? []

  async function create(input: FinalInvoiceInput) {
    if (flight.current || invoice) return
    flight.current = true; setBusy(true); setMessage('')
    try {
      const created = await createFinalInvoiceDraft(contract.id, closure, input, contract.lifecycle_revision ?? '')
      setInvoice(created)
      setMessage('Đã tạo bản nháp hóa đơn tất toán. Chưa phát hành và chưa đối soát tiền cọc.')
    } catch (failure) {
      const fields = ['damages', 'waiver_code', 'waiver_note', 'waiver_evidence',
        ...input.damages.flatMap((_, index) => ['description', 'reason', 'basis', 'amount'].map(field => `damages.${index}.${field}`))]
      applyApiErrors(failure, setError, fields)
      if (isAxiosError(failure) && failure.response?.status === 422) {
        const serverErrors = failure.response.data?.errors
        if (serverErrors && typeof serverErrors === 'object') for (const [field, messages] of Object.entries(serverErrors)) {
          const index = /^damage_photos\.(\d+)(?:\.\d+)?$/.exec(field)?.[1]
          if (index !== undefined && Number(index) < input.damages.length && Array.isArray(messages) && typeof messages[0] === 'string') {
            setError(`damages.${Number(index)}.photos`, { type: 'server', message: messages[0] })
          }
        }
      }
      if (isAxiosError(failure) && failure.response?.status === 413) {
        setError('root', { message: 'Tổng dữ liệu ảnh vượt giới hạn tải lên 20 MB. Vui lòng giảm số lượng hoặc dung lượng ảnh.' })
      }
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; setBusy(false) }
  }

  async function issue() {
    if (flight.current || !invoice?.revision) return
    flight.current = true; setBusy(true); setMessage('')
    try {
      const issued = await invoiceAction(invoice.id, 'issue', invoice.revision)
      setInvoice({ ...invoice, status: issued.status, total_amount: issued.total_amount, paid_amount: issued.paid_amount,
        contract_closure_note: issued.contract_closure_note,
        revision: issued.revision, items: issued.items?.map(item => ({ ...item, evidence_urls: item.evidence_urls ?? [] })) })
      setConfirmIssue(false)
      setMessage(issued.status === 'paid'
        ? 'Hóa đơn 0đ đã tất toán; không tạo giao dịch thu tiền.'
        : 'Đã phát hành hóa đơn tất toán. Khoản mục và tổng tiền đã được khóa.')
    } catch (failure) {
      setMessage(apiErrorMessage(failure) + (isAxiosError(failure) && failure.response?.status === 409 ? ' Tải lại dữ liệu trước khi thử lại.' : ''))
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; setBusy(false) }
  }

  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <header className="flex items-start gap-3"><Receipt className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" /><div>
      <h2 className="font-bold text-slate-900">3. Lập hóa đơn tất toán</h2>
      <p className="mt-1 text-sm text-slate-600">Gồm tiền còn thiếu, điện nước chưa thu, giảm trừ hợp lệ và các khoản đã có căn cứ. Tiền cọc được đối soát ở bước riêng.</p>
    </div></header>

    {!invoice ? <form noValidate onSubmit={event => { void handleSubmit(create)(event) }}>
      <fieldset disabled={busy} className="space-y-5">
        {contract.inspection_result === 'damaged' ? <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-amber-950">Hạng mục bồi thường</h3>
            <p className="mt-1 text-sm text-amber-900">Mỗi khoản cần lý do, căn cứ và ít nhất một ảnh riêng tư.</p></div>
            <Button type="button" size="sm" variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => append({ description: '', reason: '', basis: '', amount: 1, photos: [] })}>Thêm khoản</Button></div>
          {fields.map((field, index) => <fieldset key={field.id} className="space-y-3 rounded-xl border border-amber-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-slate-900">Hạng mục {index + 1}</h4>
              <Button type="button" size="sm" variant="ghost" aria-label={'Xóa hạng mục ' + (index + 1)} onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>
            <label className="block text-sm font-semibold">Tên khoản<input {...register(('damages.' + index + '.description') as FieldPath<FinalInvoiceInput>)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" />
              {errors.damages?.[index]?.description && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.description?.message}</span>}</label>
            <label className="block text-sm font-semibold">Lý do<textarea rows={2} {...register(('damages.' + index + '.reason') as FieldPath<FinalInvoiceInput>)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" />
              {errors.damages?.[index]?.reason && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.reason?.message}</span>}</label>
            <label className="block text-sm font-semibold">Căn cứ (ví dụ: báo giá, hóa đơn sửa chữa)<textarea rows={2} {...register(('damages.' + index + '.basis') as FieldPath<FinalInvoiceInput>)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" />
              {errors.damages?.[index]?.basis && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.basis?.message}</span>}</label>
            <label className="block text-sm font-semibold">Số tiền bồi thường (VND)<input type="number" min={1} step={1} inputMode="numeric"
              {...register(('damages.' + index + '.amount') as FieldPath<FinalInvoiceInput>, { valueAsNumber: true })} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 tabular-nums" />
              {errors.damages?.[index]?.amount && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.amount?.message}</span>}</label>
            <label className="block text-sm font-semibold">Ảnh căn cứ (JPG, PNG hoặc WebP; tối đa 5 ảnh)<input
              type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-sm"
              onChange={event => setValue(('damages.' + index + '.photos') as FieldPath<FinalInvoiceInput>, Array.from(event.target.files ?? []), { shouldDirty: true, shouldValidate: true })} />
              {!!values.damages?.[index]?.photos?.length && <span className="mt-1 block text-xs font-normal text-slate-500">{values.damages[index]?.photos?.map(file => file?.name).join(' · ')}</span>}
              {errors.damages?.[index]?.photos && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.photos?.message}</span>}</label>
          </fieldset>)}
          {errors.damages?.root && <p role="alert" className="text-sm text-rose-700">{errors.damages.root.message}</p>}
        </section> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">Đã xác nhận không có hư hỏng; hóa đơn không có dòng bồi thường.</p>}

        {preview.early_termination_fee > 0 && <section className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">Điều khoản miễn phí (nếu đủ điều kiện)</h3>
          {waiverConditions.length ? <>
            <label className="block text-sm font-semibold">Điều kiện đã ghi trong hợp đồng
              <select {...register('waiver_code')} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3">
                <option value="">Không áp dụng miễn phí</option>
                {waiverConditions.map(condition => <option key={condition.code} value={condition.code}>{condition.description}</option>)}
              </select>
            </label>
            {values.waiver_code && <>
              <label className="block text-sm font-semibold">Căn cứ áp dụng<textarea rows={3} {...register('waiver_note')} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" />
                {errors.waiver_note && <span role="alert" className="mt-1 block text-rose-700">{errors.waiver_note.message}</span>}</label>
              <label className="block text-sm font-semibold">Ảnh căn cứ miễn (ít nhất 1 ảnh)<input type="file" multiple accept="image/jpeg,image/png,image/webp"
                className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-sm"
                onChange={event => setValue('waiver_evidence', Array.from(event.target.files ?? []), { shouldDirty: true, shouldValidate: true })} />
                {!!values.waiver_evidence?.length && <span className="mt-1 block text-xs font-normal text-slate-500">{values.waiver_evidence.map(file => file?.name).join(' · ')}</span>}
                {errors.waiver_evidence && <span role="alert" className="mt-1 block text-rose-700">{errors.waiver_evidence.message}</span>}</label>
            </>}
          </> : <p className="text-sm text-slate-600">Hợp đồng không có điều kiện miễn phí đã lưu; phí theo điều khoản đã ký là {formatVND(preview.early_termination_fee)}.</p>}
        </section>}

        {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}
        <Button type="submit" disabled={busy || !contract.inspection_result}>{busy ? 'Đang lập nháp…' : 'Lập hóa đơn tất toán nháp'}</Button>
      </fieldset>
    </form> : <div className="space-y-4 rounded-xl border border-teal-200 bg-teal-50 p-4">
      <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" /><div>
        <h3 className="font-semibold text-teal-950">Hóa đơn tất toán #{invoice.id} · {invoice.status === 'draft' ? 'Bản nháp' : invoice.status === 'paid' ? 'Đã tất toán' : 'Đã phát hành'}</h3>
        <p className="mt-1 text-sm text-teal-900">Tổng do Backend tính: <strong>{formatVND(invoice.total_amount)}</strong></p>
      </div></div>
      <ul className="space-y-2 text-sm text-slate-800">{invoice.items?.map(item => <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 border-t border-teal-100 pt-2">
        <span>{item.description}{item.basis ? <span className="block text-xs text-slate-500">Căn cứ: {item.basis}</span> : null}</span>
        <strong className="tabular-nums">{formatVND(item.amount)}</strong>
      </li>)}</ul>
      {invoice.contract_closure_note && <p className="whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Ghi chú bàn giao hiện tại của hợp đồng: {'\n'}{invoice.contract_closure_note}</p>}
      <Link className="inline-block font-semibold text-sky-700 underline" to={`/admin/invoices/${invoice.id}`}>Mở chi tiết hóa đơn và khoản khác</Link>
      {invoice.status === 'draft' && (confirmIssue ? <div role="alert" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm text-amber-950">Phát hành sẽ khóa các khoản mục, hạn thanh toán và tổng tiền. Hãy kiểm tra tổng {formatVND(invoice.total_amount)} trước khi xác nhận.</p>
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={busy || !invoice.revision} onClick={() => void issue()}>{busy ? 'Đang phát hành…' : 'Xác nhận phát hành'}</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmIssue(false)}>Quay lại kiểm tra</Button></div>
      </div> : <Button type="button" disabled={busy || !invoice.revision} onClick={() => setConfirmIssue(true)}>Phát hành hóa đơn tất toán</Button>)}
      {message && <p role="status" className="text-sm text-teal-900">{message}</p>}
      {invoice.status !== 'draft' && <><p className="text-sm text-slate-600">Chưa thanh lý hợp đồng/phòng. Tiếp tục tải đối soát công nợ và tiền cọc trước khi xác nhận trả phòng.</p>
        <Button type="button" disabled={busy} onClick={onReload}>Tiếp tục đối soát cọc</Button></>}
    </div>}
    {message && !invoice && <p role="status" className="text-sm text-teal-800">{message}</p>}
    {!invoice && <Button type="button" variant="outline" disabled={busy} onClick={onReload}>Tải lại dữ liệu bàn giao</Button>}
    {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}
  </section>
}

function InspectionForm({ contract, onAuthFailure, onSaved }: { contract: Contract; onAuthFailure: () => void; onSaved: (contract: Contract) => void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const flight = useRef(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const { register, handleSubmit, setValue, setError, watch, reset, formState: { errors } } = useForm<ContractInspectionInput>({
    resolver: zodResolver(contractInspectionSchema),
    defaultValues: { inspection_result: contract.inspection_result ?? 'no_damage', inspection_note: contract.inspection_note ?? '', photos: [] },
  })
  const photos = watch('photos')

  async function submit(input: ContractInspectionInput) {
    if (flight.current) return
    flight.current = true; setBusy(true); setMessage('')
    try {
      const saved = await saveContractInspection(contract.id, input, contract.lifecycle_revision ?? '')
      reset({ inspection_result: saved.inspection_result ?? 'no_damage', inspection_note: saved.inspection_note ?? '', photos: [] })
      if (photoInput.current) photoInput.current.value = ''
      setMessage('Đã lưu kết quả kiểm tra tài sản vào hợp đồng.')
      onSaved(saved)
    } catch (failure) {
      applyApiErrors(failure, setError, ['inspection_result', 'inspection_note', 'photos'])
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; setBusy(false) }
  }

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <header className="flex items-start gap-3"><Camera className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" /><div><h2 className="font-bold text-slate-900">2. Kiểm tra tài sản</h2>
      <p className="mt-1 text-sm text-slate-500">Ghi kết quả và ảnh bàn giao. Đây là bước bắt buộc trước khi lập hóa đơn tất toán; hư hỏng phải có căn cứ và ảnh riêng tư.</p></div></header>
    {contract.inspection_result && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
      <p className="font-semibold">Kết quả gần nhất: {contract.inspection_result === 'damaged' ? 'Có hư hỏng' : 'Không có hư hỏng'}</p>
      {contract.inspected_at && <p className="mt-1 text-slate-500">Đã ghi nhận {formatDateTime(contract.inspected_at)}.</p>}
      {contract.inspection_note && <p className="mt-1 whitespace-pre-wrap">{contract.inspection_note}</p>}
      {!!contract.inspection_photos?.length && <div className="mt-3 flex flex-wrap gap-2">{contract.inspection_photos.map(photo => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" aria-label="Mở ảnh kiểm tra tài sản">
        <img src={photo.url} alt="Ảnh kiểm tra tài sản" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
      </a>)}</div>}
    </div>}
    <form noValidate onSubmit={event => { void handleSubmit(submit)(event) }}>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block text-sm font-bold">Kết quả kiểm tra
          <select {...register('inspection_result')} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 sm:max-w-sm">
            <option value="no_damage">Không có hư hỏng</option><option value="damaged">Có hư hỏng</option>
          </select>
          {errors.inspection_result && <span role="alert" className="mt-1 block text-rose-700">{errors.inspection_result.message}</span>}
        </label>
        <label className="block text-sm font-bold">Ghi chú kiểm tra<textarea {...register('inspection_note')} rows={3} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" />
          {errors.inspection_note && <span role="alert" className="mt-1 block text-rose-700">{errors.inspection_note.message}</span>}
        </label>
        <label className="block text-sm font-bold">Ảnh hiện trạng (tối đa 5 ảnh, 5 MB mỗi ảnh)
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-sm"
            onChange={event => setValue('photos', Array.from(event.target.files ?? []), { shouldDirty: true, shouldValidate: true })} />
          {photos.length > 0 && <span className="mt-1 block font-normal text-slate-500">{photos.map(photo => photo.name).join(' · ')}</span>}
          {errors.photos && <span role="alert" className="mt-1 block text-rose-700">{errors.photos.message}</span>}
        </label>
        <p className="text-xs text-slate-500">Ảnh được lưu riêng tư; chỉ Admin và cư dân thuộc hợp đồng này có quyền xem.</p>
        {message && <p role="status" className="text-sm text-teal-800">{message}</p>}
        {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu kết quả kiểm tra'}</Button>
      </fieldset>
    </form>
  </section>
}
