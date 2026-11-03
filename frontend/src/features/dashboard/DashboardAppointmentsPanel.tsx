import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { businessToday, formatDate, formatDateTime } from '@/lib/format'
import { getDashboardAppointments } from './api'

type Appointments = Awaited<ReturnType<typeof getDashboardAppointments>>
const labels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', completed: 'Hoàn tất', cancelled: 'Đã hủy' }
export function DashboardAppointmentsPanel() {
  const day = businessToday()
  const [attempt, setAttempt] = useState(0)
  const key = `${day}:${attempt}`
  const [result, setResult] = useState<{ key: string; data?: Appointments; error?: string }>()
  useEffect(() => {
    const abort = new AbortController()
    getDashboardAppointments(day, abort.signal).then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(failure => { if (!abort.signal.aborted) setResult({ key, error: apiErrorMessage(failure) }) })
    return () => abort.abort()
  }, [day, key])
  const current = result?.key === key ? result : undefined
  const data = current?.data
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold text-slate-900">Khách xem phòng hôm nay</h2><Button size="sm" variant="outline" onClick={() => setAttempt(value => value + 1)}>Tải lại lịch hôm nay</Button></div>
    <p className="text-xs text-slate-500">Ngày {formatDate(day)} · Giờ Việt Nam</p>
    {current?.error ? <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{current.error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Thử lại lịch hôm nay</Button></div>
      : !data ? <p role="status" className="text-sm text-slate-500">Đang tải lịch hôm nay…</p>
      : <><p className="text-sm text-slate-500">Hiển thị {Math.min(data.data.length, 5)} / {data.meta.total} lịch hẹn.</p>
        {!data.data.length ? <p className="text-sm text-slate-500">Chưa có lịch xem phòng trong ngày.</p> : <ul className="divide-y divide-slate-100">{data.data.slice(0, 5).map(item => <li key={item.id} className="py-3 space-y-1"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-sm text-slate-900 break-words">{item.guest_name}</p><span className="text-xs text-slate-500">{labels[item.status]}</span></div><p className="text-xs text-slate-500">{formatDateTime(item.preferred_at)} · {item.code ?? `#${item.id}`}</p><Link className="text-sm text-sky-700 hover:underline break-words" to={`/admin/rooms/${item.room.id}?tab=appointments`}>{item.room.code} · {item.room.building_name}</Link></li>)}</ul>}</>}
    <Link to={`/admin/viewing-appointments?date=${day}`} className="inline-block text-sm font-semibold text-sky-700 hover:underline">Mở lịch trong ngày</Link>
  </section>
}
