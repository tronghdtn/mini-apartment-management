import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, ChevronLeft, ChevronRight, Plus, RefreshCw, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { getMaintenanceRequests } from './api'
import { maintenancePriorityLabels, maintenancePriorityTones, maintenanceStatusLabels, maintenanceStatusTones } from './labels'
import type { MaintenancePage, MaintenanceStatus } from './types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'

export type MaintenanceAudience = 'resident' | 'admin' | 'technician'

const statusOptions: Array<MaintenanceStatus | ''> = ['', 'pending', 'in_progress', 'resolved', 'rejected']
const routePrefix: Record<MaintenanceAudience, string> = {
  resident: '/resident/requests',
  admin: '/admin/maintenance-requests',
  technician: '/staff/maintenance-requests',
}

export function MaintenanceRequestList({ audience, roomId }: { audience: MaintenanceAudience; roomId?: number }) {
  const navigate = useNavigate()
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
  const changeStatus = (value: MaintenanceStatus | '') => {
    if (value === status) return
    setLoading(true)
    setError('')
    setPage(1)
    setStatus(value)
  }
  const changePage = (next: number) => { setLoading(true); setError(''); setPage(next) }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Lọc theo trạng thái">
          {statusOptions.map(option => {
            const active = status === option
            return (
              <button
                key={option || 'all'}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeStatus(option)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {option ? maintenanceStatusLabels[option] : 'Tất cả trạng thái'}
              </button>
            )
          })}
        </div>
        <Button type="button" variant="outline" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={retry}>
          Tải lại
        </Button>
      </div>

      {loading && !result ? (
        <p role="status" className="py-8 text-center text-sm text-slate-500">Đang tải yêu cầu sửa chữa…</p>
      ) : error && !loading ? (
        <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p>{error}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={retry}>Thử lại</Button>
            <a className="text-sky-700 underline" href="/login">Đăng nhập</a>
          </div>
        </div>
      ) : result && (
        <RefreshingFrame busy={loading} className="space-y-5">{result.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            icon={<Wrench className="h-7 w-7" />}
            title="Chưa có yêu cầu phù hợp"
            description={isResident ? 'Khi phòng gặp sự cố, gửi yêu cầu để theo dõi tiến độ tại đây.' : 'Các yêu cầu được phân công hoặc tiếp nhận sẽ hiển thị tại đây.'}
            action={isResident ? <Link to="/resident/requests/new"><Button icon={<Plus className="h-4 w-4" />}>Báo sự cố</Button></Link> : undefined}
          />
        </div>
      ) : (
        <>
          {isResident ? (
            <div className="space-y-3">
              {result.data.map(request => (
                <article
                  key={request.id}
                  onClick={() => navigate(`${routePrefix[audience]}/${request.id}`)}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-sky-300 hover:shadow-md transition-all cursor-pointer sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={maintenanceStatusTones[request.status]} dot>{maintenanceStatusLabels[request.status]}</Badge>
                      <Badge tone={maintenancePriorityTones[request.priority]}>{maintenancePriorityLabels[request.priority]}</Badge>
                    </div>
                    <span className="text-xs text-slate-400">Gửi lúc {formatDateTime(request.created_at ?? '')}</span>
                  </div>
                  <h2 className="mt-2.5 text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                    <Link to={`${routePrefix[audience]}/${request.id}`} onClick={e => e.stopPropagation()}>
                      {request.title}
                    </Link>
                  </h2>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{request.description}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>
                      <strong className="text-slate-700">Phòng {request.room.code}</strong> · {request.room.building_name}
                      {request.assignee ? <> · Kỹ thuật viên: <strong className="text-slate-800">{request.assignee.full_name}</strong></> : ' · Đang chờ phân công'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-sky-700 group-hover:translate-x-0.5 transition-transform">
                      Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500 whitespace-nowrap">
                  <tr>
                    <th className="px-5 py-3 font-medium">Sự cố</th>
                    <th className="px-4 py-3 font-medium">Phòng / Người báo</th>
                    <th className="px-4 py-3 font-medium">Ưu tiên</th>
                    <th className="px-4 py-3 font-medium">Kỹ thuật viên</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Gửi lúc</th>
                    <th className="w-10 px-3 py-3" aria-label="Mở"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.data.map(request => {
                    const targetUrl = `${routePrefix[audience]}/${request.id}`
                    return (
                      <tr
                        key={request.id}
                        onClick={() => navigate(targetUrl)}
                        className="group align-top hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="max-w-md px-5 py-4">
                          <Link
                            to={targetUrl}
                            onClick={e => e.stopPropagation()}
                            className="font-semibold text-slate-900 hover:text-sky-700 block text-sm leading-snug transition-colors"
                          >
                            {request.title}
                          </Link>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">{request.description}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">Phòng {request.room.code}</p>
                          <p className="max-w-48 truncate text-xs text-slate-500" title={request.room.building_name}>{request.room.building_name}</p>
                          {isAdmin && request.reporter?.full_name && (
                            <p className="mt-1 text-xs text-slate-600">{request.reporter.full_name}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {request.priority === 'high' || request.priority === 'urgent'
                            ? <Badge size="sm" tone={maintenancePriorityTones[request.priority]}>{maintenancePriorityLabels[request.priority]}</Badge>
                            : <span className="text-xs text-slate-600">{maintenancePriorityLabels[request.priority]}</span>}
                        </td>
                        <td className="px-4 py-4 text-xs">
                          {request.assignee ? (
                            <span className="whitespace-nowrap text-slate-800">{request.assignee.full_name}</span>
                          ) : (
                            <span className="whitespace-nowrap italic text-slate-400">Chưa phân công</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge size="sm" tone={maintenanceStatusTones[request.status]} dot>{maintenanceStatusLabels[request.status]}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500 tabular-nums">
                          {formatDateTime(request.created_at ?? '')}
                        </td>
                        <td className="px-3 py-4 text-slate-300 group-hover:text-slate-500"><ChevronRight className="h-4 w-4" aria-hidden="true" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <nav aria-label="Phân trang yêu cầu sửa chữa" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} yêu cầu</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={!result.links.prev} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => changePage(Math.max(1, page - 1))}>
                Trước
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!result.links.next} onClick={() => changePage(page + 1)}>
                Sau <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </nav>
        </>
        )}</RefreshingFrame>
      )}
    </div>
  )
}
