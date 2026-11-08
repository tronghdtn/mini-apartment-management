import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/** Khung thẻ dùng chung cho các khối trên trang Tổng quan. */
export function DashboardCard({ title, action, children, className = '' }: { title: string; action?: { to: string; label: string }; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action && (
          <Link to={action.to} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-800">
            {action.label}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-3 text-sm text-rose-700">
      <p>{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>Thử lại</Button>
    </div>
  )
}

export function DashboardLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-3/5 animate-pulse rounded bg-slate-100" />
    </div>
  )
}
