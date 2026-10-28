import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate } from '@/lib/format'
import { approveSubmission, getSubmissions, rejectSubmission } from './api'
import { PrivateMeterPhoto } from './PrivateMeterPhoto'
import { rejectionSchema, type RejectionInput } from './schemas'
import type { MeterSubmission, SubmissionPage } from './types'

export function SubmissionList({ admin = false, revision = 0, rooms = [], onBusyChange, onReviewed }: { admin?: boolean; revision?: number; rooms?: { id: number; code: string; building_id: number }[]; onBusyChange?: (busy: boolean) => void; onReviewed?: () => void }) {
  const { refresh } = useAuth()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState(admin ? 'pending' : '')
  const [period, setPeriod] = useState('')
  const [roomId, setRoomId] = useState('')
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: SubmissionPage; error?: string }>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [rejecting, setRejecting] = useState<MeterSubmission | null>(null)
  const inFlight = useRef(false)
  const form = useForm<RejectionInput>({ resolver: zodResolver(rejectionSchema), defaultValues: { rejection_reason: '' } })
  const key = `${page}:${status}:${period}:${roomId}:${revision}:${reload}`
  useEffect(() => {
    const abort = new AbortController()
    getSubmissions(page, status, period, roomId, abort.signal).then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(failure => { if (!abort.signal.aborted) { setResult({ key, error: apiErrorMessage(failure) }); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() } })
    return () => abort.abort()
  }, [key, page, status, period, roomId, refresh])
  const data = result?.key === key ? result.data : undefined
  const error = result?.key === key ? result.error : undefined
  async function review(item: MeterSubmission, reason?: string) {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); onBusyChange?.(true); setMessage('')
    try {
      const saved = reason === undefined ? await approveSubmission(item.id) : await rejectSubmission(item.id, reason)
      setMessage(`Yêu cầu #${saved.id}: ${saved.status === 'approved' ? `đã duyệt, chỉ số chính thức #${saved.approved_meter_reading_id}` : 'đã từ chối'}.`)
      setRejecting(null); setReload(value => value + 1); onReviewed?.()
    } catch (failure) {
      let message = apiErrorMessage(failure)
      if (isAxiosError(failure) && failure.response?.status === 422) {
        const errors: unknown = failure.response.data?.errors
        if (errors && typeof errors === 'object') {
          const detail = Object.values(errors).find(value => Array.isArray(value) && typeof value[0] === 'string')
          if (detail) message = (detail as string[])[0]
        }
      }
      setMessage(message)
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
    } finally { inFlight.current = false; setBusy(false); onBusyChange?.(false) }
  }
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><h2 className="text-lg font-bold">{admin ? 'Duyệt ảnh chỉ số cư dân' : 'Lịch sử gửi chỉ số của tôi'}</h2>
    <label className="block text-sm font-semibold">Trạng thái yêu cầu<select value={status} disabled={busy} onChange={event => { setStatus(event.target.value); setPage(1) }} className="ml-2 rounded-xl border border-slate-200 p-2"><option value="">Tất cả</option><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="rejected">Từ chối</option></select></label>
    {message && <p role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{message}</p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Kỳ yêu cầu<input type="date" value={period} disabled={busy} onChange={event => { setPeriod(event.target.value); setPage(1) }} className="mt-1 w-full rounded-xl border border-slate-200 p-2" /></label>{admin && <label className="text-sm font-semibold">Phòng yêu cầu<select value={roomId} disabled={busy} onChange={event => { setRoomId(event.target.value); setPage(1) }} className="mt-1 w-full rounded-xl border border-slate-200 p-2"><option value="">Tất cả phòng</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.code} · Tòa #{room.building_id}</option>)}</select></label>}</div>
    {error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>Tải lại yêu cầu</Button></div> : !data ? <p role="status">Đang tải yêu cầu chỉ số…</p> : <>
      {!data.data.length && <p>Chưa có yêu cầu trong phạm vi đã chọn.</p>}
      {data.data.map(item => <article key={item.id} className="space-y-3 rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">Yêu cầu #{item.id} · {item.room.code}</h3><span className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-800">{({ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' })[item.status]}</span></div><p className="text-sm text-slate-600">{item.room.building_name} · {item.service.name} · Kỳ {formatDate(item.period)} · Ngày đo {formatDate(item.reading_date)}</p><p className="text-sm">Chỉ số cư dân gửi: <strong className="font-mono">{item.current_reading}</strong> {item.service.unit} · Hợp đồng #{item.contract_id}</p>
        <PrivateMeterPhoto id={item.id} onAuthFailure={refresh} />{item.rejection_reason && <p className="text-sm text-rose-700">Lý do từ chối: {item.rejection_reason}</p>}{item.approved_meter_reading_id && <p className="text-sm text-teal-800">Chỉ số chính thức #{item.approved_meter_reading_id}</p>}
        {admin && item.status === 'pending' && <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void review(item)}>Duyệt yêu cầu #{item.id}</Button><Button variant="outline" disabled={busy} onClick={() => { form.reset(); setRejecting(item) }}>Từ chối yêu cầu #{item.id}</Button></div>}
      </article>)}<nav aria-label="Phân trang yêu cầu chỉ số" className="flex flex-wrap items-center justify-between gap-2 text-sm"><p>Trang {data.meta.current_page}/{data.meta.last_page} · {data.meta.total} yêu cầu</p><div className="flex gap-2"><Button variant="outline" disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Yêu cầu trước</Button><Button variant="outline" disabled={busy || page >= data.meta.last_page} onClick={() => setPage(value => value + 1)}>Yêu cầu sau</Button></div></nav>
    </>}
    <Modal isOpen={!!rejecting} title={`Từ chối yêu cầu #${rejecting?.id ?? ''}`} onClose={() => { if (!busy) setRejecting(null) }}><form noValidate onSubmit={event => void form.handleSubmit(input => { if (rejecting) return review(rejecting, input.rejection_reason) })(event)} className="space-y-4"><label className="block text-sm font-bold">Lý do từ chối<textarea {...form.register('rejection_reason')} disabled={busy} className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3" /></label>{form.formState.errors.rejection_reason && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.rejection_reason.message}</p>}<Button type="submit" disabled={busy}>Xác nhận từ chối</Button></form></Modal>
  </section>
}
