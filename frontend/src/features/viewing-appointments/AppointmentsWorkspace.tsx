import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { changeAppointment, getAppointments } from './api'
import { appointmentActionSchema, appointmentFiltersSchema, appointmentTimeSchema, vietnamAppointmentTime } from './schemas'
import type { AppointmentActionInput } from './schemas'
import { appointmentLabels } from './types'
import type { AppointmentPage, ViewingAppointment } from './types'

type Action = { item: ViewingAppointment; action: string; label: string }
export function AppointmentsWorkspace({ mode, roomId }: { mode: 'admin' | 'guard' | 'owner'; roomId?: number }) {
  const { refresh } = useAuth()
  const [params, setParams] = useSearchParams()
  const queryField = (name: string) => roomId === undefined ? name : `appointments_${name}`
  const status = params.get(queryField('status')) ?? 'all', page = params.get(queryField('page')) ?? '1', date = params.get(queryField('date')) ?? ''
  const Heading = roomId === undefined ? 'h1' : 'h2'
  const [retry, setRetry] = useState(0), [selected, setSelected] = useState<Action>()
  const key = `${status}:${page}:${date}:${retry}:${mode}:${roomId ?? 'all'}`
  const [result, setResult] = useState<{ key: string; data?: AppointmentPage; error?: string }>()
  const valid = appointmentFiltersSchema.safeParse({ status, page, date }).success
  useEffect(() => {
    if (!valid) return
    const abort = new AbortController()
    getAppointments({ status, page, date }, abort.signal, roomId).then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(failure => { if (!abort.signal.aborted) { setResult({ key, error: apiErrorMessage(failure) }); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() } })
    return () => abort.abort()
  }, [key, status, page, date, valid, refresh, roomId])
  const current = result?.key === key ? result : undefined
  function filter(name: string, value: string) { const next = new URLSearchParams(params); next.set(queryField(name), value); if (name !== 'page') next.delete(queryField('page')); setParams(next) }
  return <div className="min-w-0 space-y-6">
    <header className="border-b border-slate-200 pb-5"><Heading className="flex items-center gap-2 text-2xl font-extrabold text-slate-900"><Calendar className="h-6 w-6 text-sky-600" />{mode === 'guard' ? 'Đón khách xem phòng hôm nay' : mode === 'admin' ? 'Lịch xem phòng' : 'Lịch hẹn của tôi'}</Heading><p className="mt-2 text-sm text-slate-500">{mode === 'guard' ? 'Chỉ lịch đã xác nhận trong ngày Việt Nam. Check-in trước check-out; quản trị viên hoàn tất lịch.' : 'Giờ hẹn hiển thị theo Việt Nam. Đổi giờ qua quản trị viên và cần xác nhận lại.'}</p></header>
    {roomId !== undefined && <Link to="/admin/viewing-appointments" className="inline-block text-sm text-sky-700 hover:underline">Mở trang quản lý lịch xem phòng</Link>}
    <div className="flex flex-wrap gap-3 items-center justify-between">
      {mode !== 'guard' && <nav className="flex gap-3 overflow-x-auto max-w-full border-b border-slate-200" aria-label="Trạng thái lịch">{(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(tab => <button type="button" key={tab} disabled={!!selected} onClick={() => filter('status', tab)} className={`whitespace-nowrap border-b-2 px-2 py-3 text-sm font-bold ${status === tab ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500'}`}>{tab === 'all' ? 'Tất cả' : appointmentLabels[tab]}</button>)}</nav>}
      {mode === 'admin' && <label className="text-sm">Ngày hẹn <input type="date" value={date} onChange={event => filter('date', event.target.value)} className="rounded-xl border border-slate-300 p-2" /></label>}
      <Button variant="outline" disabled={!!selected} onClick={() => setRetry(value => value + 1)}>Tải lại</Button>
    </div>
    {!valid || current?.error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-white p-5"><p>{!valid ? 'Bộ lọc lịch hẹn không hợp lệ.' : current?.error}</p><Button onClick={() => { const next = new URLSearchParams(params); for (const name of ['status', 'page', 'date']) next.delete(queryField(name)); setParams(next); setRetry(value => value + 1) }}>Thử lại</Button></div> : !current?.data ? <p role="status">Đang tải lịch hẹn…</p> : <>
      <p className="text-sm text-slate-500">{current.data.meta.total} lịch phù hợp</p>
      {!current.data.data.length ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Chưa có lịch hẹn phù hợp.</p> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Khách xem phòng', 'Tòa nhà / Phòng', 'Thời gian (VN)', 'Trạng thái', ...(roomId === undefined ? ['Thao tác'] : [])].map(heading => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead><tbody>{current.data.data.map(item => <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-4"><p className="font-bold">{item.guest_name}</p><p>{item.guest_phone}</p><p className="text-xs text-slate-500">{item.code}</p></td><td className="px-5 py-4">{item.room.building_name}<p className="font-semibold">{item.room.code}</p></td><td className="px-5 py-4 whitespace-nowrap">{formatDateTime(item.preferred_at)}{item.checked_in_at && <p className="text-xs text-teal-700">Đến: {formatDateTime(item.checked_in_at)}</p>}{item.checked_out_at && <p className="text-xs text-slate-500">Rời: {formatDateTime(item.checked_out_at)}</p>}</td><td className="px-5 py-4"><span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${item.status === 'confirmed' ? 'bg-sky-50 text-sky-700' : item.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{appointmentLabels[item.status]}</span></td>{roomId === undefined && <td className="px-5 py-4"><div className="flex flex-wrap gap-2 min-w-40">{actions(item, mode).map(([action, label]) => <Button key={action} variant="outline" disabled={!!selected} onClick={() => setSelected({ item, action, label })}>{label}</Button>)}</div></td>}</tr>)}</tbody></table></div>}
      <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Phân trang lịch hẹn"><p className="text-sm">Trang {current.data.meta.current_page}/{current.data.meta.last_page}</p><div className="flex gap-2"><Button variant="outline" disabled={!!selected || Number(page) <= 1} onClick={() => filter('page', String(Number(page) - 1))}>Trước</Button><Button variant="outline" disabled={!!selected || Number(page) >= current.data.meta.last_page} onClick={() => filter('page', String(Number(page) + 1))}>Sau</Button></div></nav>
    </>}
    {selected && <AppointmentAction key={`${selected.item.id}:${selected.action}`} selected={selected} close={() => setSelected(undefined)} done={() => { setSelected(undefined); setRetry(value => value + 1) }} />}
  </div>
}

function actions(item: ViewingAppointment, mode: string): [string, string][] {
  const result: [string, string][] = []
  if (mode === 'guard') {
    if (!item.checked_in_at) result.push(['check-in', 'Check-in'])
    else if (!item.checked_out_at) result.push(['check-out', 'Check-out'])
  } else {
    if (mode === 'admin') {
      if (item.status === 'pending') result.push(['confirm', 'Xác nhận'])
      if (['pending', 'confirmed'].includes(item.status) && !item.checked_in_at) result.push(['reschedule', 'Đổi giờ'])
      if (item.status === 'confirmed' && item.checked_out_at) result.push(['complete', 'Hoàn tất'])
    }
    if (item.can_cancel) result.push(['cancel', 'Hủy lịch'])
  }
  return result
}

function AppointmentAction({ selected, close, done }: { selected: Action; close: () => void; done: () => void }) {
  const { refresh } = useAuth()
  const flight = useRef(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<AppointmentActionInput>({ resolver: zodResolver(appointmentActionSchema), defaultValues: { preferred_at: '', note: '' } })
  async function submit(input: AppointmentActionInput) {
    if (flight.current) return
    const data: Record<string, string> = {}
    if (selected.action === 'reschedule') {
      const parsed = appointmentTimeSchema.safeParse(input.preferred_at)
      if (!parsed.success) { setError('preferred_at', { message: parsed.error.issues[0].message }); return }
      if (!input.note) { setError('note', { message: 'Nhập lý do đổi giờ.' }); return }
      data.preferred_at = vietnamAppointmentTime(input.preferred_at)
    }
    if (['reschedule', 'confirm', 'complete'].includes(selected.action)) data.admin_note = input.note
    if (['check-in', 'check-out'].includes(selected.action)) data.guard_note = input.note
    flight.current = true
    try { await changeAppointment(selected.item.id, selected.action, data); done() }
    catch (failure) { applyApiErrors(failure, setError, ['preferred_at']); if (isAxiosError(failure) && failure.response?.status === 422) { const note = failure.response.data?.errors?.admin_note?.[0] ?? failure.response.data?.errors?.guard_note?.[0]; if (typeof note === 'string') setError('note', { message: note }) } if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() }
    finally { flight.current = false }
  }
  return <Modal isOpen onClose={() => { if (!flight.current) close() }} title={`${selected.label} · ${selected.item.code}`}><form onSubmit={event => { void handleSubmit(submit)(event) }} className="space-y-5"><p className="text-sm text-slate-600">{selected.item.guest_name} · {selected.item.room.code} · {formatDateTime(selected.item.preferred_at)}</p><fieldset disabled={isSubmitting} className="space-y-4">{selected.action === 'reschedule' && <label className="block space-y-2 text-sm font-semibold">Thời gian mới (giờ Việt Nam)<input {...register('preferred_at')} type="datetime-local" className="block w-full rounded-xl border border-slate-300 p-3" />{errors.preferred_at && <span role="alert" className="text-rose-700">{errors.preferred_at.message}</span>}</label>}{selected.action !== 'cancel' && <label className="block space-y-2 text-sm font-semibold">Ghi chú<textarea {...register('note')} rows={3} className="block w-full rounded-xl border border-slate-300 p-3" />{errors.note && <span role="alert" className="text-rose-700">{errors.note.message}</span>}</label>}{errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={close}>Đóng</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang xử lý…' : selected.label}</Button></div></fieldset></form></Modal>
}
