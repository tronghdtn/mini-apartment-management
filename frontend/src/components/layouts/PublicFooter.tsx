import { Link } from 'react-router'
import { Building2, Search, FileText, Info } from 'lucide-react'

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 mb-8 border-b border-slate-800">
          <div className="flex gap-3">
            <Search aria-hidden="true" className="w-6 h-6 text-sky-400 shrink-0" />
            <div><h2 className="font-semibold text-white">Tìm phòng theo nhu cầu</h2><p className="text-sm text-slate-400 mt-1">Lọc theo giá, diện tích, sức chứa và tiện nghi.</p></div>
          </div>
          <div className="flex gap-3">
            <FileText aria-hidden="true" className="w-6 h-6 text-emerald-400 shrink-0" />
            <div><h2 className="font-semibold text-white">Thông tin niêm yết</h2><p className="text-sm text-slate-400 mt-1">Giá thuê và tiền cọc hiển thị theo thông tin từng phòng.</p></div>
          </div>
          <div className="flex gap-3">
            <Info aria-hidden="true" className="w-6 h-6 text-amber-400 shrink-0" />
            <div><h2 className="font-semibold text-white">Lịch xem phòng</h2><p className="text-sm text-slate-400 mt-1">Đặt lịch trực tuyến chưa được mở. Hệ thống chưa tiếp nhận lịch hẹn tại đây.</p></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
          <div className="space-y-3">
            <Link to="/" className="inline-flex items-center gap-2.5 text-xl font-extrabold text-white"><Building2 aria-hidden="true" className="w-8 h-8 text-sky-400" /><span>Mini<span className="text-sky-400">Apart</span></span></Link>
            <p className="text-sm text-slate-400">Hệ thống quản lý chung cư mini và thông tin phòng cho thuê.</p>
            <p className="text-sm text-slate-400">Thông tin liên hệ chính thức chưa được công bố.</p>
          </div>
          <nav aria-label="Khám phá phòng" className="space-y-3">
            <h2 className="text-sm font-bold text-white">Khám phá phòng</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/rooms" className="hover:text-white">Tất cả phòng đang cho thuê</Link></li>
              <li><Link to="/rooms?max_price=2999999" className="hover:text-white">Phòng dưới 3 triệu</Link></li>
              <li><Link to="/rooms?min_price=3000000&max_price=4500000" className="hover:text-white">Phòng 3–4,5 triệu</Link></li>
              <li><Link to="/rooms?sort=price_asc" className="hover:text-white">Giá từ thấp đến cao</Link></li>
            </ul>
          </nav>
          <nav aria-label="Tài khoản" className="space-y-3">
            <h2 className="text-sm font-bold text-white">Tài khoản</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/login" className="hover:text-white">Đăng nhập</Link></li>
              <li><Link to="/register" className="hover:text-white">Đăng ký tài khoản</Link></li>
            </ul>
          </nav>
        </div>
        <p className="pt-6 text-xs text-slate-500">Mini Apartment Management · Hệ thống quản lý chung cư mini</p>
      </div>
    </footer>
  )
}
