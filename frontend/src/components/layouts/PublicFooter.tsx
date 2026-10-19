import React from 'react'
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
import { buildings } from '@/mocks/data'

export const PublicFooter: React.FC = () => {
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
              <h4 className="text-sm font-semibold text-white">Chính chủ 100% — Không môi giới</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ký hợp đồng trực tiếp với chủ sở hữu. Không mất bất kỳ phí trung gian hay phí xem phòng nào.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Hình ảnh & Giá thực tế</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ảnh chụp thực tế từng căn phòng. Giá thuê và chi phí dịch vụ niêm yết công khai, minh bạch.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Bảo trì & Hỗ trợ kỹ thuật 24h</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Đội ngũ kỹ thuật viên riêng biệt tiếp nhận và xử lý nhanh chóng mọi vấn đề điện nước sinh hoạt.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Links & Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Mini<span className="text-sky-400">Apart</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Hệ thống quản lý chuỗi căn hộ mini và phòng studio khép kín chất lượng cao tại Hà Nội. Không gian sống tiện nghi, an toàn, phù hợp sinh viên và người đi làm.
            </p>
            <div className="pt-1 flex flex-col gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Hotline: <strong className="text-white">0901.000.001</strong> (8:00 - 21:00)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Email: <strong className="text-white">hotro@miniapartment.vn</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Lịch xem phòng: Thứ 2 – Chủ nhật (Cả ngày)</span>
              </div>
            </div>
          </div>

          {/* Buildings List */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-white">
              Hệ thống tòa nhà
            </h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {buildings.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/rooms?buildingId=${b.id}`}
                    className="hover:text-white transition-colors block"
                  >
                    <span className="font-medium text-slate-200">{b.name}</span>
                    <span className="block text-[11px] text-slate-500 truncate mt-0.5">
                      {b.district}, Hà Nội
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-white">
              Khám phá nhanh
            </h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/rooms" className="hover:text-white transition-colors">
                  Phòng trống mới nhất
                </Link>
              </li>
              <li>
                <Link to="/rooms?priceRange=under-3m" className="hover:text-white transition-colors">
                  Phòng dưới 3 triệu
                </Link>
              </li>
              <li>
                <Link to="/rooms?priceRange=3m-4.5m" className="hover:text-white transition-colors">
                  Phòng 3.0 - 4.5 triệu
                </Link>
              </li>
              <li>
                <Link to="/rooms?amenity=Ban+công" className="hover:text-white transition-colors">
                  Căn hộ có ban công
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Quy trình xem phòng
                </Link>
              </li>
            </ul>
          </div>

          {/* Operating Notes */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-white">
              Chính sách cư dân
            </h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <span className="text-slate-300">Không chung chủ</span>, giờ giấc tự do 100%
              </li>
              <li>
                <span className="text-slate-300">Khóa vân tay</span> an toàn bảo mật
              </li>
              <li>
                <span className="text-slate-300">Được nấu ăn</span> trong phòng
              </li>
              <li>
                <span className="text-slate-300">Hợp đồng linh hoạt</span> từ 6 - 12 tháng
              </li>
              <li>
                <span className="text-slate-300">Hóa đơn điện tử</span> minh bạch ngày 1 hàng tháng
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 MiniApart Management. Bản quyền thuộc về Hệ thống Quản lý Chung cư Mini.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Giao diện thử nghiệm công khai</span>
            <span>•</span>
            <span>Thiết kế bởi Senior Product & UI/UX Designer</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
