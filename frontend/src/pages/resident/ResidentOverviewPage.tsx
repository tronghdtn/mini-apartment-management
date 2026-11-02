import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { ResidentRecentRequestsCard } from '@/features/maintenance-requests/ResidentRecentRequestsCard'
import { ResidentMeterReadingsPanel } from '@/features/meter-submissions/ResidentMeterReadingsPanel'
import { RecentUnreadNotificationsCard } from '@/features/notifications/RecentUnreadNotificationsCard'
import { ResidentDebtCard, ResidentRoomBanner } from '@/features/resident-overview/ResidentOverviewCards'
import { useResidentOverview } from '@/features/resident-overview/useResidentOverview'

// Source: ui-antigravity-full/src/pages/resident/ResidentOverviewPage.tsx. Hợp đồng/công nợ do Backend tổng hợp (/resident/overview).
export function ResidentOverviewPage() {
  const { user } = useAuth()
  const { current, reload } = useResidentOverview()
  const overview = current?.data
  return <div className="space-y-6">
    {!current ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Đang tải tổng quan…</p>
      : current.error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-5">
        <p className="text-sm text-rose-700">{current.error}</p>
        <Button className="mt-3" variant="outline" onClick={reload}>Thử lại tổng quan</Button>
      </div> : overview && <>
        <ResidentRoomBanner name={user?.full_name ?? ''} overview={overview} />
        <ResidentDebtCard debt={overview.debt} />
      </>}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ResidentRecentRequestsCard canCreate={overview?.active_contract != null} />
      <RecentUnreadNotificationsCard to="/resident/notifications" />
    </div>
    <ResidentMeterReadingsPanel />
  </div>
}
