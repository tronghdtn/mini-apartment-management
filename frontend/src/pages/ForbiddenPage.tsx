import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Home, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { profileDestination, roleLabels } from '@/features/auth/types'

export function ForbiddenPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  return <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 p-4"><div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 shadow-xs"><ShieldAlert aria-hidden="true" className="h-10 w-10" /></div>
    <div><p className="font-mono text-xs font-bold uppercase tracking-widest text-rose-600">Mã lỗi 403 — Forbidden</p><h1 className="mt-1 text-2xl font-black text-slate-900">Không có quyền truy cập</h1><p className="mt-2 text-sm leading-relaxed text-slate-500">{user ? <>Tài khoản với vai trò <strong className="text-slate-800">{roleLabels[user.role]}</strong> không có quyền truy cập khu vực này.</> : 'Bạn cần đăng nhập bằng tài khoản có quyền phù hợp.'}</p></div>
    <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs text-slate-600"><p className="font-bold text-slate-800">Quyền truy cập theo tài khoản</p><p>Cư dân chỉ xem dữ liệu của mình.</p><p>Kỹ thuật viên chỉ xử lý việc được phân công.</p><p>Bảo vệ chỉ xem lịch đã xác nhận trong ngày.</p></div>
    <div className="flex flex-wrap justify-center gap-2"><Button variant="outline" size="sm" onClick={() => navigate(-1)} icon={<ArrowLeft className="h-4 w-4" />}>Quay lại</Button><Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"><Home aria-hidden="true" className="h-4 w-4" />Về trang chủ</Link></div><Link to={user ? profileDestination(user) : '/login'} className="inline-block text-sm font-semibold text-sky-700">{user ? 'Tài khoản của tôi' : 'Đăng nhập'}</Link>
  </div></div>
}
