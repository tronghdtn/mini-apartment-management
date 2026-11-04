import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { useApiResource } from '@/hooks/useApiResource'
import { dashboardQueues, type DashboardQueue } from './activity'
import { getDashboardQueue } from './api'

function QueueCard({ queue }: { queue: DashboardQueue }) {
  const { data: count, error, reload } = useApiResource(queue.key, signal => getDashboardQueue(queue, signal))
  return <div className="min-w-0 rounded-xl border border-amber-100 bg-white p-4 space-y-2">
    <h3 className="text-sm font-semibold text-slate-800">{queue.label}</h3>
    {error ? <div role="alert" className="space-y-2"><p className="text-sm text-rose-700">{error}</p><Button size="sm" variant="outline" onClick={reload}>Thử lại {queue.label.toLowerCase()}</Button></div>
      : count === undefined ? <p role="status" className="text-sm text-slate-500">Đang tải…</p> : <p className="text-2xl font-bold text-slate-900 tabular-nums">{count}</p>}
    <Link to={queue.href} className="inline-block text-sm font-semibold text-sky-700 hover:underline">Mở danh sách</Link>
  </div>
}
export function DashboardWorkQueue() {
  return <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-4"><h2 className="font-bold text-slate-900">Việc cần xử lý</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{dashboardQueues.map(queue => <QueueCard key={queue.key} queue={queue} />)}</div><p className="text-xs text-slate-600">Số lượng trên toàn danh sách từ máy chủ. Thanh toán chờ xác nhận chưa được trừ công nợ.</p></section>
}
