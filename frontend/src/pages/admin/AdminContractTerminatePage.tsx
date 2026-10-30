import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { isAxiosError } from 'axios'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getContract, previewContractClosure, saveContractInspection } from '@/features/contracts/api'
import { closurePreviewSchema, closureReasonLabels, type ClosurePreview, type ClosurePreviewInput } from '@/features/contracts/closure'
import { contractInspectionSchema, type ContractInspectionInput } from '@/features/contracts/inspection'
import type { Contract } from '@/features/contracts/types'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'

export function AdminContractTerminatePage() {
  const { contractId } = useParams<{ contractId: string }>()
  const { refresh } = useAuth()
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{ id: string; contract?: Contract; error?: string }>()
  useEffect(() => {
    const abort = new AbortController()
    getContract(contractId ?? '', abort.signal).then(contract => {
      if (!abort.signal.aborted) setResult({ id: `${contractId}:${retry}`, contract })
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
        {current.contract.status !== 'active' ? <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">Chỉ xem trước bàn giao cho hợp đồng đang hiệu lực.</p>
          : <><ClosureForm key={`${current.contract.id}:${current.contract.lifecycle_revision}`} contract={current.contract} onAuthFailure={() => void refresh()} onReload={() => setRetry(value => value + 1)} />
            <InspectionForm key={current.contract.id} contract={current.contract}
              onAuthFailure={() => void refresh()} onSaved={contract => setResult({ id: `${contractId}:${retry}`, contract })} /></>}</>}
  </div>
}

function ClosureForm({ contract, onAuthFailure, onReload }: { contract: Contract; onAuthFailure: () => void; onReload: () => void }) {
  const [busy, setBusy] = useState(false)
  const flight = useRef(false)
  const [result, setResult] = useState<{ key: string; revision: string; data: ClosurePreview }>()
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<ClosurePreviewInput>({ resolver: zodResolver(closurePreviewSchema), defaultValues: { actual_end_date: '', closure_note: '' } })
  const values = useWatch({ control })
  const key = JSON.stringify(values)
  const preview = result?.key === key && result.revision === contract.lifecycle_revision ? result.data : undefined
  async function submit(input: ClosurePreviewInput) {
    if (flight.current) return
    flight.current = true; setBusy(true); setResult(undefined)
    try {
      const data = await previewContractClosure(contract.id, input, contract.lifecycle_revision ?? '')
      setResult({ key, revision: contract.lifecycle_revision ?? '', data })
    } catch (failure) {
      applyApiErrors(failure, setError, ['actual_end_date', 'closure_note'])
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; setBusy(false) }
  }
  return <><form noValidate onSubmit={event => { void handleSubmit(submit)(event) }} className="rounded-2xl border border-slate-200 bg-white p-5"><fieldset disabled={busy} className="space-y-4">
    <h2 className="font-bold text-slate-900">1. Ngày bàn giao và lý do</h2>
    <label className="block text-sm font-bold">Ngày bàn giao thực tế<input type="date" {...register('actual_end_date')} min={contract.start_date} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 sm:max-w-xs" />{errors.actual_end_date && <span role="alert" className="mt-1 block text-rose-700">{errors.actual_end_date.message}</span>}</label>
    <label className="block text-sm font-bold">Lý do và ghi chú<textarea {...register('closure_note')} rows={3} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" />{errors.closure_note && <span role="alert" className="mt-1 block text-rose-700">{errors.closure_note.message}</span>}</label>
    <p className="text-sm text-slate-500">Bắt buộc ghi lý do khi nhận–trả cùng ngày, trả trước hạn hoặc quá hạn. Ngày bàn giao không tính tiền phòng cho hợp đồng cũ.</p>
    {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? 'Đang kiểm tra…' : 'Xem trước phí bàn giao'}</Button><Button type="button" variant="outline" onClick={onReload}>Tải lại hợp đồng</Button></div></fieldset></form>
    {preview && <section role="status" className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50 p-5"><h2 className="font-bold text-teal-900">{closureReasonLabels[preview.closure_reason]}</h2>
      <p className="text-sm">Ngày bàn giao đúng hạn: {formatDate(preview.planned_handover_date)}</p><p className="font-bold">Phí chấm dứt trước hạn: {formatVND(preview.early_termination_fee)}</p>
      <p className="text-sm text-slate-700">Đây chỉ là bản xem trước theo điều khoản hợp đồng. Chưa chốt điện nước, hóa đơn tất toán hoặc hoàn/khấu trừ cọc; hợp đồng và trạng thái phòng chưa thay đổi.</p></section>}
  </>
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
      <p className="mt-1 text-sm text-slate-500">Ghi kết quả và ảnh bàn giao. Hạng mục hư hỏng, căn cứ và số tiền sẽ được lưu riêng ở hóa đơn tất toán.</p></div></header>
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
