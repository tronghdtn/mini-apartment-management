import React, { Suspense, useState } from 'react'
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
  X,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { AccountActions } from '@/features/auth/AccountActions'
import { useDialogFocus } from '@/hooks/useDialogFocus'

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

const NOT_BUILT_TITLE = 'Chức năng chưa được kết nối'

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user } = useAuth()
  const drawerRef = useDialogFocus(mobileMenuOpen, () => setMobileMenuOpen(false))
  const hideLabels = collapsed && !mobileMenuOpen

  const navGroups: { group: string; items: AdminNavItem[] }[] = [
    {
      group: 'Tổng quan',
      items: [
        { to: '/admin', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
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
        { to: '/admin/viewing-appointments', label: 'Lịch xem phòng', icon: <Calendar className="w-4 h-4" /> },
        { to: '/admin/residents', label: 'Cư dân', icon: <Users className="w-4 h-4" /> },
        { to: '/admin/contracts', label: 'Hợp đồng', icon: <FileText className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Dịch vụ & Điện nước',
      items: [
        { to: '/admin/services', label: 'Danh mục dịch vụ', icon: <Layers className="w-4 h-4" /> },
        { to: '/admin/utility-prices', label: 'Lịch sử đơn giá', icon: <Zap className="w-4 h-4" /> },
        { to: '/admin/meter-readings', label: 'Chỉ số điện nước', icon: <Gauge className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Tài chính',
      items: [
        { to: '/admin/invoices', label: 'Hóa đơn', icon: <Receipt className="w-4 h-4" /> },
        {
          to: '/admin/payments',
          label: 'Thanh toán & Đối soát',
          icon: <CreditCard className="w-4 h-4" />,
        },
        { to: '/admin/debts', label: 'Công nợ', icon: <AlertCircle className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Vận hành',
      items: [
        {
          to: '/admin/maintenance-requests',
          label: 'Yêu cầu sửa chữa',
          icon: <Wrench className="w-4 h-4" />,
        },
      ],
    },
    {
      group: 'Hệ thống',
      items: [
        { to: '/admin/users', label: 'Tài khoản & Phân quyền', icon: <ShieldCheck className="w-4 h-4" /> },
        { to: '/admin/settings', label: 'Cài đặt hệ thống', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ]

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-700 border-r border-slate-200/90 shadow-2xs">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80 bg-white">
        <Link to="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          {!hideLabels && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                Mini<span className="text-sky-600">Apart</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">
                Quản trị viên
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3">
        {navGroups.map((grp) => {
          const isOverviewGroup = grp.group === 'Tổng quan' || grp.group.toLowerCase() === 'tổng quan'
          return (
            <div key={grp.group} className="space-y-0.5">
              {!hideLabels && !isOverviewGroup && (
                <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 pt-1.5">
                  {grp.group}
                </span>
              )}
              {grp.items.map((item) =>
                item.notBuilt ? (
                  <div
                    key={item.to}
                    aria-disabled="true"
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[13.5px] font-medium text-slate-400 opacity-60 cursor-not-allowed select-none"
                    title={collapsed ? `${item.label} — ${NOT_BUILT_TITLE}` : NOT_BUILT_TITLE}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0 flex items-center justify-center text-slate-400">{item.icon}</span>
                      {!hideLabels && <span className="truncate">{item.label}</span>}
                    </div>
                    {!hideLabels && (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
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
                      `flex items-center justify-between px-3 py-1.5 rounded-lg text-[13.5px] font-medium transition-all group ${
                        isActive
                          ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200/80 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0 flex items-center justify-center text-slate-500 group-hover:text-slate-800">{item.icon}</span>
                      {!hideLabels && <span className="truncate">{item.label}</span>}
                    </div>
                    {!hideLabels && item.badge && (
                      <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ),
              )}
            </div>
          )
        })}
      </div>

      {/* Current User Footer */}
      <div className="p-2.5 border-t border-slate-200/80 bg-slate-50/50">
        <Link
          to="/admin/profile"
          className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition"
          title="Hồ sơ cá nhân Admin"
        >
          <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 border border-sky-200 font-bold text-xs flex items-center justify-center shrink-0">
            {user?.full_name.slice(0, 2).toUpperCase()}
          </div>
          {!hideLabels && (
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-slate-900 block truncate">
                {user?.full_name}
              </span>
              <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                Quản trị viên
              </span>
            </div>
          )}
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased">

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
          <div ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Điều hướng quản trị" className="relative w-72 max-w-[85vw] h-full z-10">
            <button type="button" aria-label="Đóng menu" onClick={() => setMobileMenuOpen(false)} className="absolute right-2 top-3 z-20 rounded-lg bg-white p-2 text-slate-600"><X className="h-4 w-4" /></button>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-white/95">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Hệ thống quản lý chung cư mini
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/admin/notifications" title="Thông báo hệ thống" aria-label="Thông báo hệ thống" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Bell aria-hidden="true" className="h-4.5 w-4.5" /></Link>

            <Link
              to="/"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              title="Mở website công khai trong tab mới"
            >
              <span>Xem trang Public</span>
            </Link>
            <AccountActions menu />
          </div>
        </header>

        {/* Page Outlet */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">
          <Suspense fallback={<p role="status" className="py-8 text-center text-slate-600">Đang tải trang quản trị…</p>}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  )
}
