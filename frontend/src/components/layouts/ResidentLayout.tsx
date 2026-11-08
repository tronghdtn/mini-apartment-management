import React, { Suspense } from 'react'
import { NavLink, Outlet, Link } from 'react-router'
import {
  Home,
  FileText,
  Receipt,
  Wrench,
  User,
  Building2,
} from 'lucide-react'
import { AccountActions } from '@/features/auth/AccountActions'
import { NotificationBell } from '@/features/notifications/NotificationBell'

export const ResidentLayout: React.FC = () => {

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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Mini<span className="text-sky-600">Resident</span>
            </span>
          </Link>

        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-sky-50 text-sky-700'
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
          <NotificationBell to="/resident/notifications" />
          <AccountActions menu internal />
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<p role="status" className="py-8 text-center text-slate-600">Đang tải trang…</p>}><Outlet /></Suspense>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2.5 rounded-xl text-xs font-medium transition ${
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
