import { Link } from 'react-router'
import { ApiStatusCard } from '@/features/system/ApiStatusCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function HomePage() {
  useDocumentTitle('Trang chủ')

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-10 text-white sm:px-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Hệ thống quản lý chung cư mini</h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          Quản lý tòa nhà, phòng, cư dân và hóa đơn tập trung cho chủ sở hữu nhiều tòa chung cư mini.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/rooms" className="rounded-lg bg-white px-4 py-2 font-medium text-brand-700 hover:bg-brand-50">
            Xem phòng trống
          </Link>
          <Link to="/login" className="rounded-lg border border-white/60 px-4 py-2 font-medium hover:bg-white/10">
            Đăng nhập
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ApiStatusCard />
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Khu vực demo</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/resident" className="text-brand-600 hover:underline">
                Khu vực cư dân →
              </Link>
            </li>
            <li>
              <Link to="/admin" className="text-brand-600 hover:underline">
                Khu vực quản trị →
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
