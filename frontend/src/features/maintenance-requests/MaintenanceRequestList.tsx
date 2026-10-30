import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { getMaintenanceRequests } from './api'
import { maintenancePriorityLabels, maintenancePriorityTones, maintenanceStatusLabels, maintenanceStatusTones } from './labels'
import type { MaintenancePage, MaintenanceStatus } from './types'

export type MaintenanceAudience = 'resident' | 'admin' | 'technician'

const statusOptions: Array<MaintenanceStatus | ''> = ['', 'pending', 'in_progress', 'resolved', 'rejected']
const routePrefix: Record<MaintenanceAudience, string> = {
  resident: '/resident/requests', admin: '/admin/maintenance-requests', technician: '/staff/maintenance-requests',
}

export function MaintenanceRequestList({ audience, roomId }: { audience: MaintenanceAudience; roomId?: number }) {
  const [status, setStatus] = useState<MaintenanceStatus | ''>('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<MaintenancePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const isAdmin = audience === 'admin'
  const isResident = audience === 'resident'

  useEffect(() => {
    const controller = new AbortController()
    getMaintenanceRequests({ status, room_id: roomId, page }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [status, roomId, page, revision])

  const retry = () => { setLoading(true); setError(''); setRevision(value => value + 1) }
  const changeStatus = (value: string) => { setLoading(true); setError(''); setPage(1); setStatus(value as MaintenanceStatus | '') }
  const changePage = (next: number) => { setLoading(true); setError(''); setPage(next) }

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xs">
        <label htmlFor={`maintenance-status-${audience}`} className="mb-1 block text-xs font-semibold text-slate-600">Lọc theo trạng thái</label>
        <select id={`maintenance-status-${audience}`} value={status} onChange={event => changeStatus(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          {statusOptions.map(option => <option key={option || 'all'} value={option}>{option ? maintenanceStatusLabels[option] : 'Tất cả trạng thái'}</option>)}
        </select>
      </div>
      <Button type="button" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={retry}>Tải lại</Button>
    </div>

    {loading ? <p role="status" className="py-8 text-center text-sm text-slate-500">Đang tải yêu cầu sửa chữa…</p> : error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p>{error}</p><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={retry}>Thử lại</Button><a className="text-sky-700 underline" href="/login">Đăng nhập</a></div></div> : result && result.data.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState icon={<Wrench className="h-7 w-7" />} title="Chưa có yêu cầu phù hợp" description={isResident ? 'Khi phòng gặp sự cố, gửi yêu cầu để theo dõi tiến độ tại đây.' : 'Các yêu cầu được phân công hoặc tiếp nhận sẽ hiển thị tại đây.'} action={isResident ? <Link to="/resident/requests/new"><Button icon={<Plus className="h-4 w-4" />}>Báo sự cố</Button></Link> : undefined} /></div> : result && <>
      {isResident ? <div className="space-y-3">
        {result.data.map(request => <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-wrap items-center gap-2"><Link to={`${routePrefix[audience]}/${request.id}`} className="font-mono text-sm font-bold text-slate-900 hover:text-sky-700">{request.code}</Link><Badge tone={maintenanceStatusTones[request.status]} dot>{maintenanceStatusLabels[request.status]}</Badge><Badge tone={maintenancePriorityTones[request.priority]}>{maintenancePriorityLabels[request.priority]}</Badge></div>
          <h2 className="mt-3 font-bold text-slate-900"><Link to={`${routePrefix[audience]}/${request.id}`} className="hover:text-sky-700">{request.title}</Link></h2>
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{request.description}</p>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>{request.room.building_name} · Phòng {request.room.code}</span><span>Gửi lúc {formatDateTime(request.created_at ?? '')}</span></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-slate-600">{request.assignee ? <>Kỹ thuật viên: <strong className="text-slate-900">{request.assignee.full_name}</strong></> : 'Đang chờ phân công'}</span><Link to={`${routePrefix[audience]}/${request.id}`} className="font-semibold text-sky-700 hover:underline">Xem chi tiết</Link></div>
        </article>)}
      </div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Mã / Nội dung</th><th className="px-4 py-3">Phòng / Cư dân</th><th className="px-4 py-3">Ưu tiên</th><th className="px-4 py-3">Phụ trách</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Ngày gửi</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {result.data.map(request => <tr key={request.id} className="align-top hover:bg-slate-50/70"><td className="max-w-sm px-4 py-4"><Link to={`${routePrefix[audience]}/${request.id}`} className="font-mono text-xs font-bold text-sky-700 hover:underline">{request.code}</Link><p className="mt-1 font-semibold text-slate-900">{request.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{request.description}</p></td><td className="px-4 py-4"><p className="font-semibold text-slate-800">{request.room.building_name} · {request.room.code}</p>{isAdmin && <p className="mt-1 text-xs text-slate-500">{request.reporter?.full_name ?? 'Cư dân'}</p>}</td><td className="px-4 py-4"><Badge tone={maintenancePriorityTones[request.priority]}>{maintenancePriorityLabels[request.priority]}</Badge></td><td className="px-4 py-4 text-xs text-slate-700">{request.assignee?.full_name ?? (isAdmin ? 'Chưa phân công' : '—')}</td><td className="px-4 py-4"><Badge tone={maintenanceStatusTones[request.status]} dot>{maintenanceStatusLabels[request.status]}</Badge></td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{formatDateTime(request.created_at ?? '')}</td></tr>)}
        </tbody>
      </table></div>}
      <nav aria-label="Phân trang yêu cầu sửa chữa" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} yêu cầu</p>
        <div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={!result.links.prev} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => changePage(Math.max(1, page - 1))}>Trước</Button><Button type="button" variant="outline" size="sm" disabled={!result.links.next} onClick={() => changePage(page + 1)}>Sau <ChevronRight className="h-4 w-4" /></Button></div>
      </nav>
    </>}
  </div>
}
