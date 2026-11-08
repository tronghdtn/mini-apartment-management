import React, { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { AccountActions } from '@/features/auth/AccountActions'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { getSettings } from '@/features/settings/api'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { syncSiteSettingsFromApi, usePublicSettings } from '@/lib/publicSettings'

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
  const [setupOpen, setSetupOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()
  const siteSettings = usePublicSettings()
  const systemName = siteSettings.systemName || 'MiniApart'
  const drawerRef = useDialogFocus(mobileMenuOpen, () => setMobileMenuOpen(false))
  const hideLabels = collapsed && !mobileMenuOpen

  useEffect(() => {
    const controller = new AbortController()
    getSettings(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          syncSiteSettingsFromApi(result.data)
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const navGroups: { group: string; items: AdminNavItem[]; collapsible?: boolean }[] = [
    {
      group: '',
      items: [
        { to: '/admin', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
      ],
    },
    {
      group: 'Cho thuê',
      items: [
        { to: '/admin/contracts', label: 'Hợp đồng', icon: <FileText className="w-4 h-4" /> },
        { to: '/admin/viewing-appointments', label: 'Lịch xem phòng', icon: <Calendar className="w-4 h-4" /> },
        { to: '/admin/residents', label: 'Cư dân', icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Tài chính',
      items: [
        { to: '/admin/invoices', label: 'Hóa đơn', icon: <Receipt className="w-4 h-4" /> },
        { to: '/admin/payments', label: 'Thanh toán', icon: <CreditCard className="w-4 h-4" /> },
        { to: '/admin/debts', label: 'Công nợ', icon: <AlertCircle className="w-4 h-4" /> },
        { to: '/admin/meter-readings', label: 'Chỉ số điện nước', icon: <Gauge className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Tài sản & vận hành',
      items: [
        { to: '/admin/buildings', label: 'Tòa nhà', icon: <Building2 className="w-4 h-4" /> },
        { to: '/admin/rooms', label: 'Phòng', icon: <DoorOpen className="w-4 h-4" /> },
        { to: '/admin/maintenance-requests', label: 'Yêu cầu sửa chữa', icon: <Wrench className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Thiết lập',
      collapsible: true,
      items: [
        { to: '/admin/services', label: 'Dịch vụ', icon: <Layers className="w-4 h-4" /> },
        { to: '/admin/utility-prices', label: 'Giá điện nước', icon: <Zap className="w-4 h-4" /> },
        { to: '/admin/amenities', label: 'Tiện nghi', icon: <Sparkles className="w-4 h-4" /> },
        { to: '/admin/users', label: 'Tài khoản', icon: <ShieldCheck className="w-4 h-4" /> },
        { to: '/admin/settings', label: 'Cài đặt', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ]

  const setupActive = navGroups.some(group => group.collapsible && group.items.some(item => location.pathname.startsWith(item.to)))
  const showSetup = setupOpen || setupActive || hideLabels

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-700 border-r border-slate-200">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
        <Link to="/admin" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-sky-600/20">
            <Building2 className="w-5 h-5" />
          </div>
          {!hideLabels && (
            <div className="flex flex-col min-w-0" title={systemName}>
              <span className="font-extrabold text-[17px] tracking-tight text-slate-900 leading-none">
                Mini<span className="text-sky-600">Apart</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Quản trị viên</span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          aria-label={collapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
          title={collapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav aria-label="Điều hướng quản trị" className="flex-1 overflow-y-auto px-3 py-4 space-y-5 [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]">
        {navGroups.map((grp) => {
          const open = !grp.collapsible || showSetup
          return (
            <div key={grp.group || 'home'} className="space-y-0.5">
              {grp.group && !hideLabels && (grp.collapsible ? (
                <button
                  type="button"
                  onClick={() => setSetupOpen(value => !value)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {grp.group}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              ) : (
                <span className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  {grp.group}
                </span>
              ))}
              {open && grp.items.map((item) =>
                item.notBuilt ? (
                  <div
                    key={item.to}
                    aria-disabled="true"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 opacity-60 cursor-not-allowed select-none"
                    title={collapsed ? `${item.label} — ${NOT_BUILT_TITLE}` : NOT_BUILT_TITLE}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!hideLabels && <span className="truncate">{item.label}</span>}
                  </div>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-sky-50 text-sky-700 font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-sky-600'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!hideLabels && <span className="truncate">{item.label}</span>}
                    {!hideLabels && item.badge && (
                      <span className={`ml-auto text-[11px] font-bold px-1.5 rounded-full ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ),
              )}
            </div>
          )
        })}
      </nav>

      {/* Current User Footer */}
      <div className="p-3 border-t border-slate-100">
        <div
          className="flex items-center gap-2.5 p-1.5"
          title={user?.full_name}
        >
          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
            {user?.full_name.split(' ').slice(-1)[0]?.slice(0, 1).toUpperCase()}
          </div>
          {!hideLabels && (
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-slate-900 block truncate">{user?.full_name}</span>
              <span className="text-[11px] text-slate-500 block truncate">Quản trị viên</span>
            </div>
          )}
        </div>
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
            <button type="button" aria-label="Đóng menu" onClick={() => setMobileMenuOpen(false)} className="absolute right-2 top-3.5 z-20 rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-white/95">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-base tracking-tight text-slate-900 lg:hidden" title={systemName}>Mini<span className="text-sky-600">Apart</span></span>
          </div>

          <div className="flex items-center gap-2.5">
            <NotificationBell to="/admin/notifications" />


            <AccountActions menu internal />
          </div>
        </header>

        {/* Page Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<p role="status" className="py-8 text-center text-slate-600">Đang tải trang quản trị…</p>}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  )
}
