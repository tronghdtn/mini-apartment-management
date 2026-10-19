import React from 'react'
import { NavLink, Outlet, Link } from 'react-router'
import {
  Wrench,
  CalendarCheck,
  Bell,
  User,
} from 'lucide-react'
import { useApp } from '@/mocks/AppContext'
import { RoleSwitcher } from '@/mocks/RoleSwitcher'

export const StaffLayout: React.FC = () => {
  const { role, currentUser, unreadCount } = useApp()

  const isGuard = role === 'guard'

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
      <header className="h-16 bg-slate-900 text-white sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            {isGuard ? <CalendarCheck className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
          </div>
          <div>
            <span className="font-bold text-sm block leading-tight">
              {isGuard ? 'Bảo vệ tòa nhà' : 'Kỹ thuật viên sửa chữa'}
            </span>
            <span className="text-[11px] text-slate-400 block truncate">
              {currentUser.name}
            </span>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-800 text-amber-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/staff/notifications"
            className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </Link>
          <RoleSwitcher />
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 rounded-xl text-[11px] font-medium transition ${
                isActive
                  ? 'text-amber-600 font-bold'
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
