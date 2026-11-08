import { useState } from 'react'
import { Link } from 'react-router'
import { CalendarDays, ChevronDown, ExternalLink, LogOut, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from './useAuth'
import { accountDestination, appointmentsDestination, profileDestination } from './types'
import { authErrorMessage } from './errors'

/**
 * `internal`: menu trong khu Admin/Cư dân/Nhân viên. Bỏ "Khu vực của tôi" (người dùng đang ở đúng khu vực đó)
 * và thêm liên kết mở website công khai trong tab mới.
 */
export function AccountActions({ compact = false, menu = false, internal = false }: { compact?: boolean; menu?: boolean; internal?: boolean }) {
  const { user, status, logout } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  if (status === 'loading') return <span className="text-xs text-slate-500" role="status">Đang kiểm tra phiên…</span>
  if (!user) return <Link to="/login" className="text-sm font-semibold text-sky-700">Đăng nhập</Link>
  const appointmentsPath = appointmentsDestination(user.role)
  const signOut = async () => {
    if (pending) return
    setPending(true)
    setError('')
    // Tải lại trang chủ sau khi server hủy phiên: xóa state cũ và tránh guard chuyển hướng chồng nhau.
    try { await logout(); window.location.replace('/') }
    catch (failure) { setError(authErrorMessage(failure)) }
    finally { setPending(false) }
  }
  const itemClass = 'flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50'
  if (menu) return <details className="relative shrink-0">
    <summary aria-label="Menu tài khoản" className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
      <UserRound aria-hidden="true" className="h-4 w-4 text-sky-600" /><span className="hidden xl:inline max-w-36 truncate">{user.full_name}</span><ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
    </summary>
    <div
      className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
      // Chọn một mục liên kết thì đóng menu, tránh menu còn mở khi đã sang trang khác.
      onClick={event => { if ((event.target as HTMLElement).closest('a')) event.currentTarget.closest('details')?.removeAttribute('open') }}
    >
      <div className="border-b border-slate-100 px-3.5 pb-2.5 pt-1.5">
        <p className="break-words text-sm font-semibold text-slate-900">{user.full_name}</p>
        {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
      </div>
      <div className="py-1">
        <Link to={profileDestination(user)} className={itemClass}><UserRound aria-hidden="true" className="h-4 w-4 text-slate-400" />Hồ sơ cá nhân</Link>
        {!internal && <Link to={accountDestination(user)} className={itemClass}><UserRound aria-hidden="true" className="h-4 w-4 text-slate-400" />Khu vực của tôi</Link>}
        {appointmentsPath && <Link to={appointmentsPath} className={itemClass}><CalendarDays aria-hidden="true" className="h-4 w-4 text-slate-400" />Lịch hẹn của tôi</Link>}
        {internal && <a href="/" target="_blank" rel="noopener" className={itemClass}><ExternalLink aria-hidden="true" className="h-4 w-4 text-slate-400" />Xem website<span className="sr-only"> (mở tab mới)</span></a>}
      </div>
      <div className="border-t border-slate-100 pt-1">
        <button type="button" disabled={pending} onClick={() => void signOut()} className={`${itemClass} w-full text-left disabled:opacity-60 cursor-pointer`}>
          <LogOut aria-hidden="true" className="h-4 w-4 text-slate-400" />{pending ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </button>
      </div>
      {error && <p role="alert" className="px-3.5 pb-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  </details>
  if (compact) return <Link to={profileDestination(user)} className="text-xs font-semibold text-sky-700">Tài khoản</Link>
  return <div className="flex flex-wrap items-center gap-2">
    <Link to={profileDestination(user)} className="text-xs font-semibold text-slate-700 max-w-36 truncate" title={user.full_name}>{user.full_name}</Link>
    <Link to={accountDestination(user)} className="text-xs font-semibold text-sky-700">Khu vực của tôi</Link>
    {appointmentsPath && <Link to={appointmentsPath} className="text-xs font-semibold text-sky-700">Lịch hẹn của tôi</Link>}
    <Button size="sm" variant="outline" isLoading={pending} onClick={() => void signOut()}>Đăng xuất</Button>
    {error && <p role="alert" className="basis-full text-xs text-rose-600">{error}</p>}
  </div>
}
