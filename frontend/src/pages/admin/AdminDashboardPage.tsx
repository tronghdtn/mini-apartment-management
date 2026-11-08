import { useState } from 'react'
import { Link } from 'react-router'
import { Receipt, RotateCw } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { DashboardSummaryPanel } from '@/features/dashboard/DashboardSummaryPanel'
import { DashboardBuildingsPanel } from '@/features/dashboard/DashboardBuildingsPanel'
import { DashboardWorkQueue } from '@/features/dashboard/DashboardWorkQueue'
import { DashboardAppointmentsPanel } from '@/features/dashboard/DashboardAppointmentsPanel'

const todayFormat = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })

export function AdminDashboardPage() {
  const { user } = useAuth()
  // Đổi khóa để các khối tự tải lại cùng lúc, thay cho nút tải lại riêng ở từng khối.
  const [round, setRound] = useState(0)
  const [today] = useState(() => todayFormat.format(new Date()))
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 first-letter:uppercase">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Xin chào, {user?.full_name.split(' ').slice(-1)[0] ?? 'bạn'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setRound(value => value + 1)} aria-label="Làm mới số liệu" title="Làm mới số liệu" className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 cursor-pointer">
            <RotateCw className="h-4 w-4" aria-hidden="true" />
          </button>
          <Link to="/admin/invoices" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
            <Receipt className="h-4 w-4" aria-hidden="true" />Hóa đơn
          </Link>
        </div>
      </header>
      <DashboardSummaryPanel key={`summary-${round}`} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2"><DashboardBuildingsPanel key={`buildings-${round}`} /></div>
        <DashboardWorkQueue key={`queue-${round}`} />
      </div>
      <DashboardAppointmentsPanel key={`appointments-${round}`} />
    </div>
  )
}
