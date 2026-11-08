import { Link } from 'react-router'
import { Camera, ChevronRight, CreditCard, FileClock, FileWarning, ReceiptText, Wrench } from 'lucide-react'
import { useApiResource } from '@/hooks/useApiResource'
import { dashboardQueues, type DashboardQueue } from './activity'
import { getDashboardQueue } from './api'
import { DashboardCard } from './DashboardCard'

const queueStyle: Record<DashboardQueue['key'], { icon: typeof CreditCard; active: string }> = {
  overdue_invoices: { icon: ReceiptText, active: 'bg-rose-100 text-rose-800' },
  payments: { icon: CreditCard, active: 'bg-amber-100 text-amber-800' },
  maintenance: { icon: Wrench, active: 'bg-amber-100 text-amber-800' },
  expiring: { icon: FileClock, active: 'bg-amber-100 text-amber-800' },
  overdue: { icon: FileWarning, active: 'bg-rose-100 text-rose-800' },
  meter_submissions: { icon: Camera, active: 'bg-amber-100 text-amber-800' },
}

function QueueRow({ queue }: { queue: DashboardQueue }) {
  const { data: count, error, reload } = useApiResource(queue.key, signal => getDashboardQueue(queue, signal))
  const style = queueStyle[queue.key]
  const Icon = style.icon
  return (
    <li>
      <Link to={queue.href} className="group flex items-center gap-3 rounded-lg px-2 py-2.5 -mx-2 hover:bg-slate-50">
        <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-sm text-slate-700">{queue.label}</span>
        {error ? (
          <button type="button" onClick={event => { event.preventDefault(); reload() }} className="text-xs font-medium text-rose-700 underline">Thử lại</button>
        ) : count === undefined ? (
          <span role="status" aria-label="Đang tải" className="h-5 w-7 animate-pulse rounded-full bg-slate-100" />
        ) : (
          <span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${count > 0 ? style.active : 'bg-slate-100 text-slate-500'}`}>{count}</span>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden="true" />
      </Link>
    </li>
  )
}

export function DashboardWorkQueue() {
  return (
    <DashboardCard title="Việc cần làm">
      <ul className="-my-1">{dashboardQueues.map(queue => <QueueRow key={queue.key} queue={queue} />)}</ul>
    </DashboardCard>
  )
}
