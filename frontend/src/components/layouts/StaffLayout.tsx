import React, { Suspense } from 'react'
import { NavLink, Outlet, Link } from 'react-router'
import {
  Wrench,
  CalendarCheck,
  Bell,
  User,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { AccountActions } from '@/features/auth/AccountActions'

export const StaffLayout: React.FC = () => {
  const { user } = useAuth()

  const isGuard = user?.role === 'guard'

  const navItems = isGuard
    ? [
        { to: '/staff/appointments', label: 'Lịch hôm nay', icon: <CalendarCheck className="w-5 h-5" /> },
        { to: '/staff/notifications', label: 'Thông báo', icon: <Bell className="w-5 h-5" /> },
        { to: '/staff/profile', label: 'Hồ sơ', icon: <User className="w-5 h-5" /> },
      ]
    : [
        { to: '/staff/maintenance-requests', label: 'Việc được giao', icon: <Wrench className="w-5 h-5" /> },
        { to: '/staff/notifications', label: 'Thông báo', icon: <Bell className="w-5 h-5" /> },
        { to: '/staff/profile', label: 'Hồ sơ', icon: <User className="w-5 h-5" /> },
      ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased pb-20 md:pb-6">

      {/* Top Bar */}
      <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-2xs backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-xs">
            {isGuard ? <CalendarCheck className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
          </div>
          <div>
            <span className="font-bold text-sm sm:text-base text-slate-900 block leading-tight">
              {isGuard ? 'Bảo vệ tòa nhà' : 'Kỹ thuật viên sửa chữa'}
            </span>
            <span className="text-xs text-slate-500 block truncate mt-0.5">
              {user?.full_name}
            </span>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <Link to="/staff/notifications" aria-label="Thông báo" className="rounded-xl p-2 text-slate-500 hover:bg-slate-50"><Bell aria-hidden="true" className="h-5 w-5" /></Link>
          <AccountActions menu internal />
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        <Suspense fallback={<p role="status" className="py-8 text-center text-slate-600">Đang tải trang…</p>}><Outlet /></Suspense>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 rounded-xl text-xs font-medium transition ${
                isActive
                  ? 'text-sky-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {item.icon}
            <span className="mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
