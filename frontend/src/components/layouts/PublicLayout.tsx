import { NavLink, Outlet } from 'react-router'
import { Logo } from '@/components/ui/Logo'

const currentYear = new Date().getFullYear()

const navItems = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/rooms', label: 'Phòng trống' },
  { to: '/contact', label: 'Liên hệ' },
]

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="order-last flex w-full gap-4 overflow-x-auto text-sm sm:order-none sm:w-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap py-1 font-medium ${isActive ? 'text-brand-600' : 'text-slate-600 hover:text-slate-900'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/login"
            className="ml-auto rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Đăng nhập
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-slate-500 sm:px-6">
          © {currentYear} Mini Apartment Management
        </div>
      </footer>
    </div>
  )
}
