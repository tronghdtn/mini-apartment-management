import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from './useAuth'
import { accountDestination, profileDestination } from './types'
import { authErrorMessage } from './errors'

export function AccountActions({ compact = false, menu = false }: { compact?: boolean; menu?: boolean }) {
  const { user, status, logout } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  if (status === 'loading') return <span className="text-xs text-slate-500" role="status">Đang kiểm tra phiên…</span>
  if (!user) return <Link to="/login" className="text-sm font-semibold text-sky-700">Đăng nhập</Link>
  const signOut = async () => {
    if (pending) return
    setPending(true)
    setError('')
    // Tải lại trang chủ sau khi server hủy phiên: xóa state cũ và tránh guard chuyển hướng chồng nhau.
    try { await logout(); window.location.replace('/') }
    catch (failure) { setError(authErrorMessage(failure)) }
    finally { setPending(false) }
  }
  if (menu) return <details className="relative shrink-0">
    <summary aria-label="Menu tài khoản" className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
      <UserRound aria-hidden="true" className="h-4 w-4 text-sky-600" /><span className="hidden xl:inline max-w-36 truncate">{user.full_name}</span><ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
    </summary>
    <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg space-y-2">
      <p className="break-words text-sm font-bold text-slate-900">{user.full_name}</p>
      <Link to={profileDestination(user)} className="block rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-sky-50">Hồ sơ cá nhân</Link>
      <Link to={accountDestination(user)} className="block rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-sky-50">Khu vực của tôi</Link>
      {!['admin', 'guard'].includes(user.role) && <Link to="/account/appointments" className="block rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-sky-50">Lịch hẹn của tôi</Link>}
      <Button className="w-full" size="sm" variant="outline" isLoading={pending} onClick={() => void signOut()}>Đăng xuất</Button>
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    </div>
  </details>
  if (compact) return <Link to={profileDestination(user)} className="text-xs font-semibold text-sky-700">Tài khoản</Link>
  return <div className="flex flex-wrap items-center gap-2">
    <Link to={profileDestination(user)} className="text-xs font-semibold text-slate-700 max-w-36 truncate" title={user.full_name}>{user.full_name}</Link>
    <Link to={accountDestination(user)} className="text-xs font-semibold text-sky-700">Khu vực của tôi</Link>
    <Button size="sm" variant="outline" isLoading={pending} onClick={() => void signOut()}>Đăng xuất</Button>
    {error && <p role="alert" className="basis-full text-xs text-rose-600">{error}</p>}
  </div>
}
