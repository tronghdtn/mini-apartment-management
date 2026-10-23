import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { PublicNavbar } from '@/components/layouts/PublicNavbar'
import { PublicFooter } from '@/components/layouts/PublicFooter'
import { ToastProvider } from '@/components/ui/Toast'

export const PublicLayout: React.FC = () => {
  const { pathname } = useLocation()

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-800 antialiased">
        <PublicNavbar />
        <main className="flex-1">
          {!['/login', '/register'].includes(pathname) && !pathname.startsWith('/account/') && (
            <p role="note" className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-center text-xs text-amber-900">Thông tin phòng, lịch xem và liên hệ trên các trang giới thiệu hiện là dữ liệu minh họa, chưa kết nối hệ thống quản lý.</p>
          )}
          <Outlet />
        </main>
        <PublicFooter />
      </div>
    </ToastProvider>
  )
}
