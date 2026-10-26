import React from 'react'
import { Link } from 'react-router'
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
} from 'lucide-react'
import { buildings } from '@/mocks/data'
import { Button } from '@/components/ui/Button'

export const ContactPage: React.FC = () => {
  const faqs = [
    {
      q: 'Tiền cọc khi thuê phòng là bao nhiêu?',
      a: 'Tiền cọc thông thường tương đương 01 tháng tiền phòng. Khoản cọc này được giữ bảo đảm trong suốt thời gian hiệu lực của hợp đồng và sẽ được đối soát hoàn trả đầy đủ khi hai bên thanh lý hợp đồng bàn giao phòng.',
    },
    {
      q: 'Thời hạn hợp đồng thuê phòng tối thiểu là bao lâu?',
      a: 'Hệ thống áp dụng hợp đồng linh hoạt 06 tháng hoặc 12 tháng tùy theo nhu cầu của khách thuê. Đối với hợp đồng 12 tháng, bạn sẽ được ưu đãi giữ nguyên đơn giá thuê trong suốt kỳ hạn.',
    },
    {
      q: 'Giờ giấc ra vào của tòa nhà như thế nào?',
      a: '100% các tòa nhà thuộc hệ thống MiniApart đều không chung chủ và giờ giấc tự do 24/24. Cư dân ra vào bằng hệ thống khóa vân tay và thẻ từ thông minh bảo mật 2 lớp.',
    },
    {
      q: 'Chỉ số điện nước được tính và chốt vào ngày nào?',
      a: 'Chỉ số điện nước sinh hoạt được ban quản lý ghi định kỳ vào ngày 01 hàng tháng bằng công tơ điện tử và đồng hồ nước riêng của từng phòng. Hóa đơn tháng được phát hành minh bạch với bảng kê chi tiết chỉ số cũ - chỉ số mới.',
    },
    {
      q: 'Tôi có thể đến xem phòng vào các khung giờ nào?',
      a: 'Bạn có thể ghé xem phòng vào bất kỳ ngày nào trong tuần (từ Thứ 2 đến Chủ nhật) trong khung giờ từ 08:30 đến 19:30. Vui lòng đặt lịch hẹn trước 30 - 60 phút để ban quản lý chuẩn bị tiếp đón chu đáo.',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
          Thông tin liên hệ
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Hệ Thống Tòa Nhà & Hỗ Trợ Khách Hàng
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Chúng tôi luôn sẵn sàng hỗ trợ bạn tìm kiếm căn phòng phù hợp nhất. Liên hệ trực tiếp với ban quản trị hoặc ghé thăm các cơ sở tòa nhà.
        </p>
      </div>

      {/* Main Contact Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Hotline tư vấn 24/7</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tiếp nhận lịch xem phòng & giải đáp</p>
            <a
              href="tel:0901000001"
              className="text-base font-extrabold text-sky-700 hover:underline block mt-2"
            >
              0901.000.001
            </a>
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Hòm thư điện tử</h3>
            <p className="text-xs text-slate-500 mt-0.5">Gửi ý kiến đóng góp & hợp tác</p>
            <a
              href="mailto:hotro@miniapartment.vn"
              className="text-sm font-bold text-teal-700 hover:underline block mt-2"
            >
              hotro@miniapartment.vn
            </a>
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Thời gian làm việc</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tất cả các ngày trong tuần</p>
            <span className="text-sm font-bold text-emerald-700 block mt-2">
              08:00 — 21:00 hàng ngày
            </span>
          </div>
        </div>
      </div>

      {/* Building Branches Detailed Directory */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Danh Sách Cơ Sở Chung Cư Mini
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Các tòa nhà thuộc quyền quản lý trực tiếp của hệ thống MiniApart tại Hà Nội
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {buildings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="h-44 overflow-hidden relative">
                  <img
                    src={b.coverImage}
                    alt={b.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold">
                    {b.district}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <h3 className="font-bold text-base text-slate-900">{b.name}</h3>

                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>{b.address}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Hotline quản lý tòa: <strong>{b.contactPhone}</strong></span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
                    {b.description}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-2">
                {b.mapUrl && (
                  <a
                    href={b.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Chỉ đường Maps
                    </Button>
                  </a>
                )}
                <Link to={`/rooms?building_id=${b.id}`} className="flex-1">
                  <Button variant="primary" size="sm" className="w-full text-xs">
                    Xem phòng ({b.availableRooms})
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frequently Asked Questions (FAQs) */}
      <div className="bg-slate-50/80 rounded-3xl border border-slate-200/80 p-6 sm:p-10 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
            Hỏi đáp phổ biến
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Những Câu Hỏi Khách Thuê Thường Quan Tâm
          </h2>
        </div>

        <div className="divide-y divide-slate-200">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-slate-600 mt-2 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
