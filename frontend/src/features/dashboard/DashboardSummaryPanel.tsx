import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Banknote, CircleDollarSign, DoorOpen, Wrench } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useApiResource } from '@/hooks/useApiResource'
import { formatVND } from '@/lib/format'
import { DashboardError } from './DashboardCard'
import { getDashboardSummary, getTotalRooms } from './api'

function KpiCard({ label, value, caption, icon, to, accent }: { label: string; value: ReactNode; caption: string; icon: ReactNode; to: string; accent: string }) {
  return (
    <Link to={to} className="group min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 transition-colors hover:border-slate-300">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${accent}`} aria-hidden="true">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-lg sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums [overflow-wrap:anywhere]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </Link>
  )
}

export function DashboardSummaryPanel() {
  const { refresh } = useAuth()
  const { data, error, reload } = useApiResource('dashboard-summary', getDashboardSummary, refresh)
  // Lỗi tải tổng phòng không chặn cả khối: thẻ lấp đầy lùi về số phòng đang thuê.
  const { data: totalRooms } = useApiResource('dashboard-total-rooms', getTotalRooms)
  if (error) return <div className="rounded-xl border border-rose-200 bg-white p-5"><DashboardError message={error} onRetry={reload} /></div>
  if (!data) {
    return (
      <div role="status" aria-label="Đang tải chỉ số tổng quan" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map(index => <div key={index} className="h-[124px] animate-pulse rounded-xl border border-slate-200 bg-white" />)}
      </div>
    )
  }
  const month = `${data.period.slice(5)}/${data.period.slice(0, 4)}`
  return (
    <section aria-label="Chỉ số tổng quan" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        to="/admin/rooms"
        label="Tỷ lệ lấp đầy"
        value={totalRooms ? `${Math.round((data.rented_rooms_count / totalRooms) * 100)}%` : data.rented_rooms_count}
        caption={totalRooms ? `${data.rented_rooms_count}/${totalRooms} phòng đang cho thuê` : 'Phòng có hợp đồng đang hiệu lực'}
        icon={<DoorOpen className="h-4 w-4" />}
        accent="bg-emerald-50 text-emerald-700"
      />
      <KpiCard to="/admin/payments?status=confirmed" label={`Đã thu tháng ${month}`} value={formatVND(BigInt(data.received_amount))} caption="Không gồm tiền cọc" icon={<Banknote className="h-4 w-4" />} accent="bg-emerald-50 text-emerald-700" />
      <KpiCard to="/admin/debts" label="Còn phải thu" value={formatVND(BigInt(data.outstanding_amount))} caption="Tổng công nợ chưa thanh toán" icon={<CircleDollarSign className="h-4 w-4" />} accent="bg-amber-50 text-amber-700" />
      <KpiCard to="/admin/maintenance-requests" label="Sửa chữa đang chờ" value={data.pending_maintenance_count} caption="Chưa bắt đầu xử lý" icon={<Wrench className="h-4 w-4" />} accent="bg-slate-100 text-slate-700" />
    </section>
  )
}
