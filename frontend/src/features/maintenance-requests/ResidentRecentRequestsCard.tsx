import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isAxiosError } from 'axios'
import { Plus, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { getMaintenanceRequests } from './api'
import { maintenanceStatusLabels, maintenanceStatusTones } from './labels'
import type { MaintenancePage } from './types'

/** Ba yêu cầu mới nhất của chính cư dân (trang 1, Backend sắp xếp id giảm dần). */
export function ResidentRecentRequestsCard({ canCreate }: { canCreate: boolean }) {
  const { refresh } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; data?: MaintenancePage; error?: string }>()
  useEffect(() => {
    const abort = new AbortController()
    getMaintenanceRequests({}, abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ attempt, data }) })
      .catch(failure => {
        if (abort.signal.aborted) return
        setResult({ attempt, error: apiErrorMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
      })
    return () => abort.abort()
  }, [attempt, refresh])

  const current = result?.attempt === attempt ? result : undefined
  const items = current?.data?.data.slice(0, 3) ?? []
  return <section aria-label="Yêu cầu sửa chữa gần đây" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Wrench className="h-4 w-4 text-sky-600" />Yêu cầu sửa chữa gần đây</h3>
      <Link to="/resident/requests" className="text-xs font-semibold text-sky-600 hover:text-sky-800">Xem tất cả</Link>
    </div>
    {!current ? <p role="status" className="text-xs text-slate-500">Đang tải yêu cầu sửa chữa…</p> : current.error ? <div role="alert" className="space-y-2">
      <p className="text-sm text-rose-700">{current.error}</p>
      <Button variant="outline" size="sm" onClick={() => setAttempt(value => value + 1)}>Thử lại yêu cầu sửa chữa</Button>
    </div> : !items.length ? <p className="py-6 text-center text-xs text-slate-400">Bạn chưa gửi yêu cầu sửa chữa nào.</p> : <ul className="space-y-2">
      {items.map(item => <li key={item.id}><Link to={`/resident/requests/${item.id}`} className="block min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-sky-300">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <span className="min-w-0 break-words text-xs font-bold text-slate-900 line-clamp-1">{item.title}</span>
          <Badge tone={maintenanceStatusTones[item.status]} size="sm" className="shrink-0">{maintenanceStatusLabels[item.status]}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-mono">{item.code}</span>
          <span>{item.created_at ? formatDateTime(item.created_at) : 'Chưa có thời gian'}</span>
        </div>
      </Link></li>)}
    </ul>}
    {canCreate && <Link to="/resident/requests/new" className="block"><Button size="sm" className="w-full gap-1.5 sm:w-auto" icon={<Plus className="h-4 w-4" />}>Gửi yêu cầu sửa chữa</Button></Link>}
  </section>
}
