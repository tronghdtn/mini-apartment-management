import { Link } from 'react-router'
import {
  Building2,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle,
  HeartHandshake,
} from 'lucide-react'
import { telHrefOf, usePublicSettings } from '@/lib/publicSettings'

export function PublicFooter() {
  const siteSettings = usePublicSettings()
  const systemName = siteSettings.systemName || 'MiniApart'
  const contactPhone = siteSettings.contactPhone
  const contactEmail = siteSettings.contactEmail
  const telHref = telHrefOf(contactPhone)
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Core Value Commitments Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 mb-12 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Chính chủ 100% — Không môi giới</h4>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Ký hợp đồng trực tiếp với chủ sở hữu. Không mất bất kỳ phí trung gian hay phí xem phòng nào.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Hình ảnh & Giá thực tế</h4>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Ảnh chụp thực tế từng căn phòng. Giá thuê và chi phí dịch vụ niêm yết công khai, minh bạch.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Báo sửa chữa trực tuyến</h4>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Cư dân gửi yêu cầu sửa chữa kèm ảnh ngay trên web; kỹ thuật viên tiếp nhận và cập nhật tiến độ xử lý.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Links & Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Mini<span className="text-sky-400">Apart</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Hệ thống quản lý chuỗi căn hộ mini và phòng studio khép kín chất lượng cao. Không gian sống tiện nghi, an toàn, phù hợp sinh viên và người đi làm.
            </p>
            <div className="pt-2 flex flex-col gap-2.5 text-sm text-slate-300">
              {telHref && <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Hotline: <a href={telHref} className="text-white hover:text-sky-400 font-semibold">{contactPhone}</a> (08:00 – 20:00)</span>
              </div>}
              {contactEmail && <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Email: <a href={`mailto:${contactEmail}`} className="text-white hover:text-sky-400 font-semibold">{contactEmail}</a></span>
              </div>}
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Xem phòng: Thứ 2 – Chủ nhật (08:00 – 20:00)</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h5 className="text-sm font-bold uppercase tracking-wider text-white">
              Khám phá phòng
            </h5>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/rooms" className="hover:text-white transition-colors block">
                  Tất cả phòng đang cho thuê
                </Link>
              </li>
              <li>
                <Link to="/rooms?max_price=2999999" className="hover:text-white transition-colors block">
                  Phòng dưới 3 triệu / tháng
                </Link>
              </li>
              <li>
                <Link to="/rooms?min_price=3000000&max_price=4500000" className="hover:text-white transition-colors block">
                  Phòng 3 – 4,5 triệu / tháng
                </Link>
              </li>
              <li>
                <Link to="/rooms?sort=price_asc" className="hover:text-white transition-colors block">
                  Giá từ thấp đến cao
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors block">
                  Liên hệ & Tòa nhà
                </Link>
              </li>
            </ul>
          </div>

          {/* Resident Policies */}
          <div className="space-y-3">
            <h5 className="text-sm font-bold uppercase tracking-wider text-white">
              Tiêu chuẩn cư dân
            </h5>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <strong className="text-slate-300 font-medium">Không chung chủ:</strong> giờ giấc tự do 100%
              </li>
              <li>
                <strong className="text-slate-300 font-medium">Khóa thông minh:</strong> vân tay & thẻ từ an toàn
              </li>
              <li>
                <strong className="text-slate-300 font-medium">Được nấu ăn:</strong> khu bếp riêng thông thoáng
              </li>
              <li>
                <strong className="text-slate-300 font-medium">Hợp đồng minh bạch:</strong> điều khoản chuẩn chỉnh
              </li>
              <li>
                <strong className="text-slate-300 font-medium">Hóa đơn điện tử:</strong> chốt số công khai hàng tháng
              </li>
            </ul>
          </div>

          {/* Account & Portal */}
          <div className="space-y-3">
            <h5 className="text-sm font-bold uppercase tracking-wider text-white">
              Tài khoản & Cổng dịch vụ
            </h5>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/login" className="hover:text-white transition-colors block">
                  Đăng nhập hệ thống
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors block">
                  Đăng ký tài khoản khách thuê
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors block">
                  Gửi yêu cầu hỗ trợ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 {systemName}. Hệ thống quản lý chung cư mini chính chủ.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Bảo mật dữ liệu cư dân</span>
            <span>•</span>
            <span>Báo sửa chữa trực tuyến</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
