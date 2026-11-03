import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { dashboardQueues, type DashboardQueue } from './activity'
import { getDashboardQueue } from './api'

function QueueCard({ queue }: { queue: DashboardQueue }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; count?: number; error?: string }>()
  useEffect(() => {
    const abort = new AbortController()
    getDashboardQueue(queue, abort.signal).then(count => { if (!abort.signal.aborted) setResult({ attempt, count }) })
      .catch(failure => { if (!abort.signal.aborted) setResult({ attempt, error: apiErrorMessage(failure) }) })
    return () => abort.abort()
  }, [queue, attempt])
  const current = result?.attempt === attempt ? result : undefined
  return <div className="min-w-0 rounded-xl border border-amber-100 bg-white p-4 space-y-2">
    <h3 className="text-sm font-semibold text-slate-800">{queue.label}</h3>
    {current?.error ? <div role="alert" className="space-y-2"><p className="text-sm text-rose-700">{current.error}</p><Button size="sm" variant="outline" onClick={() => setAttempt(value => value + 1)}>Thử lại {queue.label.toLowerCase()}</Button></div>
      : current?.count === undefined ? <p role="status" className="text-sm text-slate-500">Đang tải…</p> : <p className="text-2xl font-bold text-slate-900 tabular-nums">{current.count}</p>}
    <Link to={queue.href} className="inline-block text-sm font-semibold text-sky-700 hover:underline">Mở danh sách</Link>
  </div>
}
export function DashboardWorkQueue() {
  return <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-4"><h2 className="font-bold text-slate-900">Việc cần xử lý</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{dashboardQueues.map(queue => <QueueCard key={queue.key} queue={queue} />)}</div><p className="text-xs text-slate-600">Số lượng trên toàn danh sách từ máy chủ. Thanh toán chờ xác nhận chưa được trừ công nợ.</p></section>
}
