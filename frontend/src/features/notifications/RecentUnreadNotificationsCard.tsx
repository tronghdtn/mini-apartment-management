import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isAxiosError } from 'axios'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { getNotifications } from './api'
import type { NotificationPage } from './types'

/** Ba thông báo chưa đọc mới nhất; số chưa đọc do Backend đếm (unread_count). Đánh dấu đã đọc thực hiện tại trang Thông báo. */
export function RecentUnreadNotificationsCard({ to }: { to: string }) {
  const { refresh } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; data?: NotificationPage; error?: string }>()
  useEffect(() => {
    const abort = new AbortController()
    getNotifications({ status: 'unread', page: '1' }, abort.signal)
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
  return <section aria-label="Thông báo mới" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Sparkles className="h-4 w-4 text-emerald-600" />Thông báo mới
        {current?.data && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{current.data.unread_count} chưa đọc</span>}
      </h3>
      <Link to={to} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">Xem tất cả</Link>
    </div>
    {!current ? <p role="status" className="text-xs text-slate-500">Đang tải thông báo…</p> : current.error ? <div role="alert" className="space-y-2">
      <p className="text-sm text-rose-700">{current.error}</p>
      <Button variant="outline" size="sm" onClick={() => setAttempt(value => value + 1)}>Thử lại thông báo</Button>
    </div> : !items.length ? <p className="py-6 text-center text-xs text-slate-400">Không có thông báo mới.</p> : <ul className="space-y-2">
      {items.map(item => <li key={item.id} className="flex min-w-0 items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold text-slate-800">{item.title}</h4>
          <p className="mt-0.5 break-words text-xs text-slate-600 line-clamp-1">{item.body}</p>
          <p className="mt-1 text-xs text-slate-400">{item.created_at ? formatDateTime(item.created_at) : 'Chưa có thời gian'}</p>
        </div>
      </li>)}
    </ul>}
  </section>
}
