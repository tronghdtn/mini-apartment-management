import React from 'react'
import { NavLink, Outlet, Link } from 'react-router'
import {
  Home,
  FileText,
  Receipt,
  Wrench,
  User,
  Bell,
  Building2,
} from 'lucide-react'
import { useApp } from '@/mocks/AppContext'
import { RoleSwitcher } from '@/mocks/RoleSwitcher'

export const ResidentLayout: React.FC = () => {
  const { currentUser, unreadCount } = useApp()

  const navItems = [
    { to: '/resident', label: 'Tổng quan', icon: <Home className="w-5 h-5" />, end: true },
    { to: '/resident/contracts', label: 'Hợp đồng', icon: <FileText className="w-5 h-5" /> },
    { to: '/resident/invoices', label: 'Hóa đơn', icon: <Receipt className="w-5 h-5" /> },
    { to: '/resident/requests', label: 'Sửa chữa', icon: <Wrench className="w-5 h-5" /> },
    { to: '/resident/profile', label: 'Tài khoản', icon: <User className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased pb-20 md:pb-6">
      {/* Top Bar */}
      <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between backdrop-blur-md bg-white/95 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link to="/resident" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              Mini<span className="text-emerald-600">Resident</span>
            </span>
          </Link>
          {currentUser.roomCode && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              Phòng {currentUser.roomCode}
            </span>
          )}
        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/resident/notifications"
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition ${
                isActive
                  ? 'text-emerald-600 font-bold'
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
