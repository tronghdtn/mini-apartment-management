import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { isAxiosError } from 'axios'
import { useFieldArray, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, CheckCircle2, ChevronRight, Droplets, FileText, Plus, Receipt, ShieldAlert, Trash2, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { createFinalInvoiceDraft, getContract, previewFinalContractMeters, saveContractInspection } from '@/features/contracts/api'
import { finalMeterPreviewSchema, closureReasonLabels, type FinalMeterPreview, type FinalMeterPreviewInput } from '@/features/contracts/closure'
import { finalInvoiceInputSchema, type FinalInvoiceDraft, type FinalInvoiceInput } from '@/features/contracts/finalInvoice'
import { contractInspectionSchema, type ContractInspectionInput } from '@/features/contracts/inspection'
import { contractLabel, contractStatusLabels, contractStatusTones, depositStatusText, earlyTerminationFeeLabels, type Contract } from '@/features/contracts/types'
import { ContractSettlementPanel } from '@/features/contracts/ContractSettlementPanel'
import { getLatestFinalInvoice, invoiceAction } from '@/features/invoices/api'
import type { Invoice } from '@/features/invoices/types'
import { useAuth } from '@/features/auth/useAuth'
import { apiConflictMessage, apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { businessToday, formatDate, formatDateTime, formatVND } from '@/lib/format'

type StepState = 'done' | 'current' | 'pending'
const stepStyles: Record<StepState, { label: string; dot: string }> = {
  done: { label: 'Đã xong', dot: 'bg-emerald-500 text-white' },
  current: { label: 'Cần thực hiện', dot: 'bg-sky-600 text-white' },
  pending: { label: 'Chưa tới', dot: 'bg-slate-200 text-slate-600' },
}

/** Tiến trình chỉ đọc từ dữ liệu đã lưu (kiểm kê, hóa đơn tất toán, trạng thái hợp đồng); Laravel quyết định điều kiện thật. */
function HandoverProgress({ contract, finalInvoice }: { contract: Contract; finalInvoice?: Invoice | null }) {
  const terminated = contract.status === 'terminated'
  const issued = !!finalInvoice && ['issued', 'partially_paid', 'paid'].includes(finalInvoice.status)
  const steps: { title: string; state: StepState; note?: string }[] = [
    { title: 'Kiểm tra tài sản', state: terminated || contract.inspection_result ? 'done' : 'current' },
    { title: 'Ngày bàn giao và chỉ số chốt', state: terminated || finalInvoice ? 'done' : 'current', note: finalInvoice || terminated ? undefined : 'Xem trước, chưa ghi' },
    { title: 'Hóa đơn tất toán', state: terminated || issued ? 'done' : finalInvoice ? 'current' : 'pending',
      note: finalInvoice?.status === 'draft' ? 'Bản nháp, chưa phát hành' : finalInvoice?.status === 'cancelled' ? 'Đã hủy, cần lập lại' : undefined },
    { title: 'Đối soát cọc và trả phòng', state: terminated ? 'done' : issued ? 'current' : 'pending' },
  ]
  return <ol aria-label="Tiến trình bàn giao" className="space-y-3">{steps.map((step, index) => <li key={step.title} className="flex items-start gap-3">
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${stepStyles[step.state].dot}`}>{step.state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}</span>
    <span className="min-w-0 text-sm"><span className="block font-semibold text-slate-900">{step.title}</span><span className="text-xs text-slate-500">{stepStyles[step.state].label}{step.note ? ` · ${step.note}` : ''}</span></span>
  </li>)}</ol>
}

function ContractSummary({ contract, finalInvoice }: { contract: Contract; finalInvoice?: Invoice | null }) {
  const terms = contract.early_termination_fee_type
  return <aside className="space-y-4 lg:sticky lg:top-4">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Hợp đồng</h2>
      <dl className="divide-y divide-slate-100 text-sm">
        <div className="py-2"><dt className="text-xs text-slate-500">Phòng</dt><dd className="font-semibold text-slate-900">{contract.room.code} · {contract.room.building.name}</dd></div>
        <div className="py-2"><dt className="text-xs text-slate-500">Người thuê đại diện</dt><dd className="font-semibold text-slate-900 break-words">{contract.tenant.full_name} · {contract.tenant.phone}</dd></div>
        <div className="py-2 flex justify-between gap-2"><dt className="text-xs text-slate-500">Ngày nhận</dt><dd>{formatDate(contract.start_date)}</dd></div>
        <div className="py-2 flex justify-between gap-2"><dt className="text-xs text-slate-500">Ngày cuối được ở</dt><dd className="font-semibold">{formatDate(contract.end_date)}</dd></div>
        {contract.actual_end_date && <div className="py-2 flex justify-between gap-2"><dt className="text-xs text-slate-500">Ngày bàn giao</dt><dd className="font-semibold">{formatDate(contract.actual_end_date)}</dd></div>}
        <div className="py-2 flex justify-between gap-2"><dt className="text-xs text-slate-500">Tiền thuê / tháng</dt><dd className="font-semibold text-sky-700">{formatVND(contract.monthly_rent)}</dd></div>
        <div className="py-2 flex justify-between gap-2"><dt className="text-xs text-slate-500">Tiền cọc</dt><dd className="text-right">{formatVND(contract.deposit_amount)}<span className="block text-xs text-slate-500">{depositStatusText(contract)}</span></dd></div>
      </dl>
      <Link className="inline-block text-sm font-semibold text-sky-700 underline" to={`/admin/contracts/${contract.id}`}>Mở chi tiết hợp đồng</Link>
    </section>
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-2 text-sm text-amber-950">
      <h2 className="flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4 shrink-0" />Điều khoản trả trước hạn đã ký</h2>
      <p>{terms ? earlyTerminationFeeLabels[terms] : 'Chưa có snapshot điều khoản'}{terms === 'fixed' && contract.early_termination_fee_amount !== null ? `: ${formatVND(contract.early_termination_fee_amount)}` : ''}{terms === 'rent_multiple' && contract.early_termination_fee_multiplier ? `: hệ số ${contract.early_termination_fee_multiplier}` : ''}</p>
      {!!contract.early_termination_waiver_conditions?.length && <ul className="list-disc space-y-1 pl-5 text-xs">{contract.early_termination_waiver_conditions.map(item => <li key={item.code} className="break-words">Điều kiện miễn: {item.description}</li>)}</ul>}
      <p className="text-xs text-amber-800">Số phí thực tế do hệ thống tính khi xem trước theo ngày bàn giao; trang này không tự tính.</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"><h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Tiến trình</h2><HandoverProgress contract={contract} finalInvoice={finalInvoice} /></section>
  </aside>
}

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
  const contract = current?.contract
  return <div className="space-y-6">
    <header className="space-y-3 border-b border-slate-200 pb-5">
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link to="/admin/contracts" className="hover:text-slate-900">Hợp đồng</Link><ChevronRight className="h-3.5 w-3.5" />
        {contract ? <><Link to={`/admin/contracts/${contract.id}`} className="hover:text-slate-900">{contractLabel(contract)}</Link><ChevronRight className="h-3.5 w-3.5" /></> : null}<span className="font-bold text-slate-900">Bàn giao và thanh lý</span></nav>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
        <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-extrabold text-slate-900"><FileText className="h-6 w-6 shrink-0 text-sky-600" />Bàn giao và thanh lý hợp đồng</h1>
        <p className="mt-1 text-sm text-slate-500">{contract ? `${contractLabel(contract)} · Phòng ${contract.room.code} · ${contract.tenant.full_name}` : 'Kiểm tra tài sản, chốt chỉ số, lập hóa đơn tất toán rồi đối soát cọc trước khi trả phòng.'}</p></div>
        {contract && <Badge tone={contractStatusTones[contract.status]} dot>{contractStatusLabels[contract.status]}</Badge>}</div>
    </header>
    {!current ? <p role="status" className="text-sm text-slate-500">Đang tải hợp đồng…</p> : current.error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-sm text-rose-700">{current.error}</p><div className="flex flex-wrap items-center gap-3"><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử lại</Button><Link to="/admin/contracts" className="text-sm text-sky-700 underline">Về danh sách hợp đồng</Link></div></div>
      : contract && <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
        {contract.status === 'terminated' ? <>
          {current.finalInvoice && <Link className="inline-block font-semibold text-sky-700 underline" to={`/admin/invoices/${current.finalInvoice.id}`}>Mở hóa đơn tất toán</Link>}
          <ContractSettlementPanel contractId={contract.id} onTerminated={() => setRetry(value => value + 1)} onAuthFailure={() => void refresh()} />
        </> : contract.status !== 'active' ? <div role="status" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><p>Chỉ bàn giao và thanh lý hợp đồng đang hiệu lực. Bản nháp cần được nhận cọc (nếu có) và kích hoạt trước.</p><Link to={`/admin/contracts/${contract.id}`} className="font-semibold text-sky-700 underline">Về chi tiết hợp đồng</Link></div>
          : current.finalInvoice ? <><section role="status" className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <h2 className="font-bold text-teal-950">Đã lưu hóa đơn tất toán #{current.finalInvoice.id}</h2>
            <p className="text-sm text-teal-900">Chỉ số chốt và căn cứ đã được lưu. Mở hóa đơn để kiểm tra, phát hành hoặc lập lại bản đã hủy. Hợp đồng và phòng chưa được thanh lý.</p>
            <Link className="inline-block font-semibold text-sky-700 underline" to={`/admin/invoices/${current.finalInvoice.id}`}>Mở hóa đơn tất toán</Link>
          </section>{['issued', 'partially_paid', 'paid'].includes(current.finalInvoice.status) ? <ContractSettlementPanel
            contractId={contract.id} onTerminated={() => setRetry(value => value + 1)} onAuthFailure={() => void refresh()} />
            : <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Đối soát cọc và trả phòng mở sau khi hóa đơn tất toán được phát hành.</p>}</> : <>
            <InspectionForm key={contract.id} contract={contract}
              onAuthFailure={() => void refresh()} onSaved={saved => setResult({ id: `${contractId}:${retry}`, contract: saved })} />
            <ClosureForm key={`${contract.id}:${contract.lifecycle_revision}`} contract={contract} onAuthFailure={() => void refresh()} onReload={() => setRetry(value => value + 1)} /></>}
        </div>
        <div className="order-1 lg:order-2"><ContractSummary contract={contract} finalInvoice={current.finalInvoice} /></div>
      </div>}
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
      if (isAxiosError(failure) && failure.response?.status === 409) setError('root', { message: apiConflictMessage(failure) })
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; setBusy(false) }
  }
  return <><form noValidate onSubmit={event => { void handleSubmit(submit)(event) }} className="rounded-2xl border border-slate-200 bg-white p-5"><fieldset disabled={busy} className="space-y-4">
    <h2 className="font-bold text-slate-900">2. Ngày bàn giao và chỉ số chốt</h2>
    <label className="block text-sm font-bold">Ngày bàn giao thực tế<input type="date" {...register('actual_end_date')} min={contract.start_date} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 sm:max-w-xs" />{errors.actual_end_date && <span role="alert" className="mt-1 block text-rose-700">{errors.actual_end_date.message}</span>}</label>
    <label className="block text-sm font-bold">Lý do và ghi chú<textarea placeholder="VD: Bàn giao trả phòng đúng hạn hợp đồng / Cư dân xin chuyển đi sớm..." {...register('closure_note')} rows={3} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 placeholder:text-slate-400" />{errors.closure_note && <span role="alert" className="mt-1 block text-rose-700">{errors.closure_note.message}</span>}</label>
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
      <p className="text-sm text-slate-700">Bản xem trước chỉ đọc; chưa ghi chỉ số cuối, lập hóa đơn hoặc thanh lý. Khi lập nháp, hệ thống kiểm tra lại chuỗi chỉ số và nguồn tiền.</p>{preview.actual_end_date > businessToday() && <p role="note" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ngày bàn giao {formatDate(preview.actual_end_date)} còn ở tương lai: chỉ xem trước được. Hóa đơn tất toán lập được từ ngày bàn giao trở đi.</p>}</section>}
    {preview && (contract.inspection_result
      ? <FinalInvoiceForm key={result?.key} contract={contract} closure={finalMeterPreviewSchema.parse(values)} preview={preview} onAuthFailure={onAuthFailure} onReload={onReload} />
      : <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Hãy lưu kết quả kiểm tra tài sản ở bước 1 trước khi lập hóa đơn tất toán.</p>)}
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
      if (isAxiosError(failure) && failure.response?.status === 409) setError('root', { message: apiConflictMessage(failure) })
      if (isAxiosError(failure) && failure.response?.status === 422) {
        const serverErrors = failure.response.data?.errors
        if (typeof serverErrors?.damage_photos?.[0] === 'string') {
          setError('root', { type: 'server', message: serverErrors.damage_photos[0] })
        }
        if (serverErrors && typeof serverErrors === 'object') for (const [field, messages] of Object.entries(serverErrors)) {
          const index = /^damage_photos\.(\d+)(?:\.\d+)?$/.exec(field)?.[1]
          if (index !== undefined && Number(index) < input.damages.length && Array.isArray(messages) && typeof messages[0] === 'string') {
            setError(`damages.${Number(index)}.photos`, { type: 'server', message: messages[0] })
          }
        }
      }
      if (isAxiosError(failure) && failure.response?.status === 413) {
        setError('root', { message: 'Yêu cầu tải lên quá lớn. Vui lòng gửi tối đa 20 ảnh, tổng 30 MB mỗi lần.' })
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
      setMessage(apiConflictMessage(failure))
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; setBusy(false) }
  }

  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <header className="flex items-start gap-3"><Receipt className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" /><div>
      <h2 className="font-bold text-slate-900">3. Lập hóa đơn tất toán</h2>
      {!invoice && <p className="text-sm text-slate-600">Tổng ảnh bồi thường và miễn phí: tối đa 20 ảnh / 30 MB mỗi lần gửi; mỗi ảnh tối đa 5 MB.</p>}
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
            <label className="block text-sm font-semibold">Tên khoản<input placeholder="VD: Bồi thường hỏng khóa cửa" {...register(('damages.' + index + '.description') as FieldPath<FinalInvoiceInput>)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 placeholder:text-slate-400" />
              {errors.damages?.[index]?.description && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.description?.message}</span>}</label>
            <label className="block text-sm font-semibold">Lý do<textarea rows={2} placeholder="VD: Khóa cửa bị gãy chốt khi kiểm tra bàn giao..." {...register(('damages.' + index + '.reason') as FieldPath<FinalInvoiceInput>)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 placeholder:text-slate-400" />
              {errors.damages?.[index]?.reason && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.reason?.message}</span>}</label>
            <label className="block text-sm font-semibold">Căn cứ (ví dụ: báo giá, hóa đơn sửa chữa)<textarea rows={2} placeholder="VD: Hóa đơn thay khóa của thợ ngày..." {...register(('damages.' + index + '.basis') as FieldPath<FinalInvoiceInput>)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 placeholder:text-slate-400" />
              {errors.damages?.[index]?.basis && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.basis?.message}</span>}</label>
            <label className="block text-sm font-semibold">Số tiền bồi thường (VND)<input type="number" min={1} step={1} inputMode="numeric" placeholder="VD: 250000"
              {...register(('damages.' + index + '.amount') as FieldPath<FinalInvoiceInput>, { valueAsNumber: true })} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 tabular-nums placeholder:text-slate-400" />
              {errors.damages?.[index]?.amount && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.amount?.message}</span>}</label>
            <label className="block text-sm font-semibold">Ảnh căn cứ (JPG, PNG hoặc WebP; tối đa 5 ảnh)<input
              type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-sm"
              onChange={event => setValue(('damages.' + index + '.photos') as FieldPath<FinalInvoiceInput>, Array.from(event.target.files ?? []), { shouldDirty: true, shouldValidate: true })} />
              {!!values.damages?.[index]?.photos?.length && <span className="mt-1 block text-xs font-normal text-slate-500">{values.damages[index]?.photos?.map(file => file?.name).join(' · ')}</span>}
              {errors.damages?.[index]?.photos && <span role="alert" className="mt-1 block text-rose-700">{errors.damages[index]?.photos?.message}</span>}</label>
          </fieldset>)}
          {(errors.damages?.root?.message ?? errors.damages?.message) && <p role="alert" className="text-sm text-rose-700">{errors.damages?.root?.message ?? errors.damages?.message}</p>}
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
              <label className="block text-sm font-semibold">Căn cứ áp dụng<textarea rows={3} placeholder="VD: Cư dân đã gửi thông báo từ ngày..." {...register('waiver_note')} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 placeholder:text-slate-400" />
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
    <header className="flex items-start gap-3"><Camera className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" /><div><h2 className="font-bold text-slate-900">1. Kiểm tra tài sản</h2>
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
        <label className="block text-sm font-bold">Ghi chú kiểm tra<textarea placeholder="VD: Các thiết bị điều hòa, nóng lạnh, giường tủ hoạt động tốt..." {...register('inspection_note')} rows={3} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 placeholder:text-slate-400" />
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
