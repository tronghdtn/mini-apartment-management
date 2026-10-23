import { Link } from 'react-router'
import { User, Phone, Mail } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { roleLabels } from '@/features/auth/types'

export function GuestProfilePage() {
  const { user } = useAuth()
  if (!user) return null
  const fields = [
    { label: 'Họ và tên', value: user.full_name, Icon: User },
    { label: 'Số điện thoại', value: user.phone, Icon: Phone },
    { label: 'Email', value: user.email ?? 'Chưa cung cấp email', Icon: Mail },
  ]
  return <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
    <h1 className="text-2xl font-bold text-slate-900 mb-2">Tài khoản của tôi</h1>
    <p className="text-sm text-slate-500 mb-6">Thông tin tài khoản hiện đang đăng nhập.</p>
    {['resident', 'technician', 'guard'].includes(user.role) && <p role="status" className="rounded-2xl bg-sky-50 border border-sky-100 text-sky-900 p-4 mb-6">Khu vực dành cho {roleLabels[user.role].toLowerCase()} chưa hoàn thiện. Bạn có thể xem thông tin tài khoản tại đây.</p>}
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
      <dl className="space-y-5">
        {fields.map(({ label, value, Icon }) => <div key={label}><dt className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase"><Icon className="w-4 h-4 text-sky-600" />{label}</dt><dd className="mt-2 text-sm text-slate-900 break-words">{value}</dd></div>)}
        <div><dt className="text-xs font-bold text-slate-600 uppercase">Vai trò</dt><dd className="mt-2 text-sm">{roleLabels[user.role]}</dd></div>
      </dl>
      <p className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">Hiện chỉ hỗ trợ xem thông tin. Cập nhật hồ sơ và đổi mật khẩu chưa được triển khai.</p>
    </div>
    <Link to="/" className="inline-block mt-6 text-sm font-semibold text-sky-700 hover:underline">Về trang chủ</Link>
  </div>
}
