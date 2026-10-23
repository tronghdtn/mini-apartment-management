import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { useAuth } from './useAuth'
import { accountDestination } from './types'
import { authErrorMessage } from './errors'

export function AccountActions({ compact = false }: { compact?: boolean }) {
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
  if (compact) return <Link to="/account/profile" className="text-xs font-semibold text-sky-700">Tài khoản</Link>
  return <div className="flex flex-wrap items-center gap-2">
    <Link to="/account/profile" className="text-xs font-semibold text-slate-700 max-w-36 truncate" title={user.full_name}>{user.full_name}</Link>
    <Link to={accountDestination(user)} className="text-xs font-semibold text-sky-700">Khu vực của tôi</Link>
    <Button size="sm" variant="outline" isLoading={pending} onClick={() => void signOut()}>Đăng xuất</Button>
    {error && <p role="alert" className="basis-full text-xs text-rose-600">{error}</p>}
  </div>
}
