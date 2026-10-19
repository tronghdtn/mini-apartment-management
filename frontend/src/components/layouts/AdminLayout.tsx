import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Sparkles,
  FileText,
  Users,
  Calendar,
  Gauge,
  Receipt,
  CreditCard,
  AlertCircle,
  Wrench,
  Layers,
  Zap,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react'
import { useApp } from '@/mocks/AppContext'
import { RoleSwitcher } from '@/mocks/RoleSwitcher'

interface AdminNavItem {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
  badge?: number
  badgeColor?: string
  // Mục chưa có màn hình trong prototype: hiển thị mờ, không bấm được
  notBuilt?: boolean
}

const NOT_BUILT_TITLE = 'Màn hình chưa có trong prototype'

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { payments, maintenanceRequests, unreadCount, currentUser, role, setRole } = useApp()

  // Mở thẳng /admin bằng URL: đồng bộ vai trò demo một lần khi vào khu vực Admin
  // (ref chặn StrictMode gọi effect hai lần, tránh toast trùng)
  const roleSynced = useRef(false)
  useEffect(() => {
    if (roleSynced.current) return
    roleSynced.current = true
    if (role !== 'admin') setRole('admin')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length
  const pendingMaintenanceCount = maintenanceRequests.filter((m) => m.status === 'pending').length

  const navGroups: { group: string; items: AdminNavItem[] }[] = [
    {
      group: 'Tổng quan',
      items: [
        { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
      ],
    },
    {
      group: 'Bất động sản',
      items: [
        { to: '/admin/buildings', label: 'Tòa nhà', icon: <Building2 className="w-4 h-4" /> },
        { to: '/admin/rooms', label: 'Phòng', icon: <DoorOpen className="w-4 h-4" /> },
        { to: '/admin/amenities', label: 'Tiện nghi', icon: <Sparkles className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Cho thuê',
      items: [
        { to: '/admin/contracts', label: 'Hợp đồng', icon: <FileText className="w-4 h-4" /> },
        { to: '/admin/users', label: 'Người dùng & Cư dân', icon: <Users className="w-4 h-4" /> },
        { to: '/admin/viewing-appointments', label: 'Lịch xem phòng', icon: <Calendar className="w-4 h-4" />, notBuilt: true },
      ],
    },
    {
      group: 'Tài chính',
      items: [
        { to: '/admin/meter-readings', label: 'Chỉ số điện nước', icon: <Gauge className="w-4 h-4" /> },
        { to: '/admin/invoices', label: 'Hóa đơn', icon: <Receipt className="w-4 h-4" /> },
        {
          to: '/admin/payments',
          label: 'Duyệt thanh toán',
          icon: <CreditCard className="w-4 h-4" />,
          badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
          badgeColor: 'bg-amber-500 text-white',
          notBuilt: true,
        },
        { to: '/admin/debts', label: 'Công nợ', icon: <AlertCircle className="w-4 h-4" />, notBuilt: true },
      ],
    },
    {
      group: 'Vận hành',
      items: [
        {
          to: '/admin/maintenance-requests',
          label: 'Yêu cầu sửa chữa',
          icon: <Wrench className="w-4 h-4" />,
          badge: pendingMaintenanceCount > 0 ? pendingMaintenanceCount : undefined,
          badgeColor: 'bg-rose-500 text-white',
          notBuilt: true,
        },
      ],
    },
    {
      group: 'Cấu hình',
      items: [
        { to: '/admin/services', label: 'Dịch vụ', icon: <Layers className="w-4 h-4" /> },
        { to: '/admin/utility-prices', label: 'Giá điện nước', icon: <Zap className="w-4 h-4" /> },
        { to: '/admin/settings', label: 'Cài đặt hệ thống', icon: <Settings className="w-4 h-4" />, notBuilt: true },
      ],
    },
  ]

  const SidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
        <Link to="/admin" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-sky-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white leading-none">
                Mini<span className="text-sky-400">Apart</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                Quản trị viên
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {grp.group}
              </span>
            )}
            {grp.items.map((item) => item.notBuilt ? (
              <div
                key={item.to}
                aria-disabled="true"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-500 opacity-50 cursor-not-allowed select-none"
                title={collapsed ? `${item.label} — ${NOT_BUILT_TITLE}` : NOT_BUILT_TITLE}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && (
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    Chưa có
                  </span>
                )}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-sky-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Current User Footer */}
      <div className="p-3 border-t border-slate-800">
        {/* Trang hồ sơ Admin chưa có trong prototype — giữ khối hiển thị, không điều hướng */}
        <div
          className="flex items-center gap-2.5 p-2 rounded-xl"
          title={`Hồ sơ cá nhân — ${NOT_BUILT_TITLE}`}
        >
          <div className="w-8 h-8 rounded-full bg-sky-600/30 text-sky-400 border border-sky-500/30 font-bold text-xs flex items-center justify-center shrink-0">
            QL
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-white block truncate">
                {currentUser.name}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                Chủ tòa nhà (Admin)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased">
      {/* Floating Demo Role Switcher */}
      <RoleSwitcher />

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 sticky top-0 h-screen z-30 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-white/95">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Hệ thống quản lý chung cư mini
            </span>
          </div>

          <div className="flex items-center gap-3 pr-28 sm:pr-36">
            {/* Trang thông báo Admin chưa có trong prototype — giữ chuông, không điều hướng */}
            <span
              className="relative p-2 text-slate-500 rounded-xl cursor-not-allowed"
              title={`Thông báo hệ thống — ${NOT_BUILT_TITLE}`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </span>

            <Link
              to="/"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              title="Mở website công khai trong tab mới"
            >
              <span>Xem trang Public</span>
            </Link>
          </div>
        </header>

        {/* Page Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
