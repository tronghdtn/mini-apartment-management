import { useState } from 'react'
import { ProfileNameForm } from './ProfileNameForm'
import { ProfilePasswordForm } from './ProfilePasswordForm'
import { Building2, KeyRound, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from './useAuth'
import { roleLabels } from './types'

/** Antigravity profile cards backed only by the allowlisted Auth response. */
export function AccountProfile() {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  if (!user) return null
  const title = user.role === 'admin' ? 'Hồ sơ tài khoản Quản trị viên' : user.role === 'resident' ? 'Hồ sơ thông tin cư dân' : ['technician', 'guard'].includes(user.role) ? 'Hồ sơ nhân viên tòa nhà' : 'Tài khoản của tôi'
  const initials = user.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase()
  return <div className={`mx-auto space-y-6 ${user.role === 'admin' ? 'max-w-4xl' : 'max-w-2xl'}`}>
    <header><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Hệ thống / <span className="text-sky-600">Tài khoản</span></p><h1 className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 sm:text-2xl"><UserRound aria-hidden="true" className="h-6 w-6 text-sky-600" />{title}</h1><p className="mt-1 text-sm text-slate-500">Thông tin tài khoản hiện đang đăng nhập, được đọc từ hệ thống.</p></header>
    <section className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:flex-row sm:items-start" aria-label="Tổng quan tài khoản">
      <div aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-2xl font-black text-white shadow-md">{initials}</div>
      <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left"><h2 className="break-words text-xl font-bold text-slate-900">{user.full_name}</h2><div className="flex flex-wrap justify-center gap-2 sm:justify-start"><Badge tone="sky" size="sm">{roleLabels[user.role]}</Badge><Badge tone={user.status === 'active' ? 'emerald' : 'slate'} size="sm">{user.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</Badge></div><div className="flex flex-wrap justify-center gap-3 text-xs text-slate-500 sm:justify-start"><span className="inline-flex items-center gap-1.5 break-all"><Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{user.email ?? 'Chưa cung cấp email'}</span><span className="inline-flex items-center gap-1.5"><Phone aria-hidden="true" className="h-3.5 w-3.5" />{user.phone}</span></div></div>
    </section>
    <div className={`grid grid-cols-1 gap-6 ${user.role === 'admin' ? 'md:grid-cols-2' : ''}`}>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"><h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><UserRound aria-hidden="true" className="h-4 w-4 text-sky-600" />Thông tin cá nhân</h2>
        <ProfileNameForm key={user.id} user={user} busy={busy} onBusyChange={setBusy} />
      </section>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"><h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><KeyRound aria-hidden="true" className="h-4 w-4 text-amber-600" />Bảo mật tài khoản</h2><ProfilePasswordForm key={user.id} busy={busy} onBusyChange={setBusy} /><p className="flex gap-2 text-xs text-slate-500"><ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-600" />Mật khẩu và thông tin giấy tờ không được hiển thị tại trang này.</p></section>
    </div>
    {user.role !== 'user' && <p role="note" className="flex gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800"><Building2 aria-hidden="true" className="h-4 w-4 shrink-0 mt-0.5" />Thông tin phòng, tòa nhà phân công và lịch sử nghiệp vụ chỉ hiển thị khi được kết nối dữ liệu theo quyền của tài khoản.</p>}
  </div>
}
