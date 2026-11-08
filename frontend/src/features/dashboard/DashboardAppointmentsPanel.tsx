import { Link } from 'react-router'
import { CalendarCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useApiResource } from '@/hooks/useApiResource'
import { businessToday } from '@/lib/format'
import { getDashboardAppointments } from './api'
import { DashboardCard, DashboardError, DashboardLoading } from './DashboardCard'

const labels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', completed: 'Hoàn tất', cancelled: 'Đã hủy' }
const tones = { pending: 'amber', confirmed: 'sky', completed: 'emerald', cancelled: 'slate' } as const
const timeFormat = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })

export function DashboardAppointmentsPanel() {
  const day = businessToday()
  const { data, error, reload } = useApiResource(day, signal => getDashboardAppointments(day, signal))
  return (
    <DashboardCard title="Khách xem phòng hôm nay" action={{ to: `/admin/viewing-appointments?date=${day}`, label: 'Lịch hôm nay' }}>
      {error ? <DashboardError message={error} onRetry={reload} />
        : !data ? <DashboardLoading label="Đang tải lịch hôm nay" />
        : !data.data.length ? (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <CalendarCheck className="h-5 w-5 text-slate-300" aria-hidden="true" />Hôm nay chưa có lịch xem phòng.
          </div>
        ) : (
          <>
            <ul className="-my-2 divide-y divide-slate-100">
              {data.data.slice(0, 5).map(item => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  <span className="w-12 shrink-0 text-sm font-semibold text-slate-900 tabular-nums">{timeFormat.format(new Date(item.preferred_at))}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.guest_name}</p>
                    <Link to={`/admin/rooms/${item.room.id}?tab=appointments`} className="block truncate text-xs text-slate-500 hover:text-sky-700">Phòng {item.room.code} · {item.room.building_name}</Link>
                  </div>
                  <Badge size="sm" tone={tones[item.status]}>{labels[item.status]}</Badge>
                </li>
              ))}
            </ul>
            {data.meta.total > 5 && <p className="mt-3 text-xs text-slate-500">Còn {data.meta.total - 5} lịch khác trong ngày.</p>}
          </>
        )}
    </DashboardCard>
  )
}
