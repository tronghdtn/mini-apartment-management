import { PlaceholderPage } from '@/components/ui/PlaceholderPage'
import { ApiStatusCard } from '@/features/system/ApiStatusCard'

export function AdminDashboardPage() {
  return (
    <PlaceholderPage title="Dashboard" description="Tổng quan tình hình các tòa nhà (biểu đồ Recharts sẽ bổ sung sau).">
      <div className="max-w-xl">
        <ApiStatusCard />
      </div>
    </PlaceholderPage>
  )
}
