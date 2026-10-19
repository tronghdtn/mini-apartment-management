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
          <Outlet />
        </main>
        <PublicFooter />
      </div>
    </ToastProvider>
  )
}
