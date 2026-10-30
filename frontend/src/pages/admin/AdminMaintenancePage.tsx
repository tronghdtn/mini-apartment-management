import { ClipboardList, Wrench } from 'lucide-react'
import { MaintenanceRequestList } from '@/features/maintenance-requests/MaintenanceRequestList'

export function AdminMaintenancePage() {
  return <div className="space-y-6">
    <header className="border-b border-slate-200 pb-4"><div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><ClipboardList className="h-4 w-4"/>Vận hành / Sửa chữa</div><h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900"><Wrench className="h-6 w-6 text-sky-600"/>Yêu cầu sửa chữa</h1><p className="mt-1 text-sm text-slate-500">Tiếp nhận, điều chỉnh mức ưu tiên và phân công kỹ thuật viên.</p></header>
    <MaintenanceRequestList audience="admin"/>
  </div>
}
