import { LayoutDashboard } from 'lucide-react'
import { DashboardSummaryPanel } from '@/features/dashboard/DashboardSummaryPanel'
import { DashboardBuildingsPanel } from '@/features/dashboard/DashboardBuildingsPanel'
import { DashboardWorkQueue } from '@/features/dashboard/DashboardWorkQueue'
import { DashboardAppointmentsPanel } from '@/features/dashboard/DashboardAppointmentsPanel'

// Source: ui-antigravity-full/src/pages/admin/AdminDashboardPage.tsx. No business mock is imported.
export function AdminDashboardPage() {
  return <div className="space-y-6">
    <header><h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900"><LayoutDashboard aria-hidden="true" className="h-6 w-6 text-sky-600" />Tổng quan hoạt động</h1><p className="mt-2 text-sm text-slate-500">Số liệu và công việc thực tế trong hệ thống.</p></header>
    <DashboardSummaryPanel />
    <DashboardWorkQueue />
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><DashboardBuildingsPanel /><DashboardAppointmentsPanel /></div>
  </div>
}
