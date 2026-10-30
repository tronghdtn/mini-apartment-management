import { Link } from 'react-router'
import { Plus, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MaintenanceRequestList } from '@/features/maintenance-requests/MaintenanceRequestList'

export function ResidentRequestsPage() {
  return <div className="space-y-6">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><span>Dịch vụ</span><span>/</span><span className="text-sky-700">Sửa chữa</span></div><h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 sm:text-2xl"><Wrench className="h-6 w-6 text-sky-600"/>Yêu cầu sửa chữa</h1><p className="mt-1 text-sm text-slate-500">Báo sự cố trong phòng và theo dõi tiến độ xử lý.</p></div>
      <Link to="/resident/requests/new"><Button icon={<Plus className="h-4 w-4"/>}>Báo sự cố mới</Button></Link>
    </header>
    <MaintenanceRequestList audience="resident" />
  </div>
}
