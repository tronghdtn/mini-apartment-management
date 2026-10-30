import { Link, useNavigate } from 'react-router'
import { ChevronLeft, Wrench } from 'lucide-react'
import { MaintenanceRequestForm } from '@/features/maintenance-requests/MaintenanceRequestForm'

export function ResidentRequestNewPage() {
  const navigate = useNavigate()
  return <div className="mx-auto max-w-3xl space-y-5">
    <Link to="/resident/requests" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline"><ChevronLeft className="h-4 w-4"/>Yêu cầu sửa chữa</Link>
    <header><div className="flex items-center gap-2 text-sky-700"><Wrench className="h-5 w-5"/><span className="text-xs font-semibold uppercase tracking-wide">Báo sự cố</span></div><h1 className="mt-2 text-2xl font-extrabold text-slate-900">Gửi yêu cầu sửa chữa</h1><p className="mt-1 text-sm text-slate-500">Mô tả đủ rõ để Ban quản lý tiếp nhận và phân công xử lý.</p></header>
    <MaintenanceRequestForm onCancel={() => navigate('/resident/requests')} onCreated={request => navigate(`/resident/requests/${request.id}`, { replace: true })}/>
  </div>
}
