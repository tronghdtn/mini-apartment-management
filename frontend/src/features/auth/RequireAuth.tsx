import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth'
import type { UserRole } from './types'
import { ForbiddenPage } from '@/pages/ForbiddenPage'

export function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { user, status, error, refresh } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <p role="status" className="p-8 text-center text-slate-600">Đang kiểm tra phiên đăng nhập…</p>
  if (status === 'error') return <div role="alert" className="p-8 text-center space-y-4"><p>{error}</p><button onClick={() => void refresh()} className="text-sky-700 underline">Thử lại</button></div>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (roles && !roles.includes(user.role)) return <ForbiddenPage />
  return <>{error && <p role="alert" className="p-3 bg-amber-50 text-amber-900 text-sm">{error} <button onClick={() => void refresh()} className="underline">Thử lại</button></p>}<Outlet /></>
}
