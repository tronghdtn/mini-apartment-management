import React, { useState } from 'react'
import { useParams, Link } from 'react-router'
import {
  MapPin,
  CheckCircle2,
  Building2,
  Calendar,
  ExternalLink,
  ChevronRight,
  PhoneCall,
  Check,
} from 'lucide-react'
import { rooms, buildings, publicServices } from '@/mocks/data'
import { formatVND } from '@/lib/format'
import { RoomGallery } from '@/features/rooms/RoomGallery'
import { BookingForm } from '@/features/rooms/BookingForm'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export const RoomDetailPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()

  // Find room from mock data
  const room = rooms.find((r) => r.id.toString() === roomId && r.status === 'available')
  const building = room ? buildings.find((b) => b.id === room.buildingId) : null

  // Modal booking state for mobile CTA
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  if (!room) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Phòng Này Hiện Không Nhận Lịch Xem
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Căn phòng bạn đang tìm có thể đã có khách đặt cọc hoặc đang trong giai đoạn cập nhật thông tin. Hãy tham khảo các căn phòng trống khác cùng tòa nhà.
        </p>
        <Link to="/rooms">
          <Button variant="primary" size="md">
            Xem danh sách phòng trống khác
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-24 sm:pb-16">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-slate-100 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
            <Link to="/" className="hover:text-slate-900 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Link to="/rooms" className="hover:text-slate-900 transition-colors">
              Danh sách phòng
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-700 font-medium">{room.buildingName}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-900 font-bold">{room.code}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Main Grid: Left Details & Right Booking Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* LEFT COLUMN: Gallery & Specifications (7 or 8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* Interactive Image Gallery */}
            <RoomGallery images={room.images} title={room.title} />

            {/* Room Primary Header & Specs */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-6 shadow-xs">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Còn trống — Sẵn sàng bàn giao
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                    Tầng {room.floor}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold font-mono">
                    Mã phòng: {room.code}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {room.title}
                </h1>

                {/* Building Location & Google Maps Link */}
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs sm:text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>{room.buildingAddress}</span>
                  {building?.mapUrl && (
                    <a
                      href={building.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-600 font-semibold hover:underline ml-1"
                    >
                      <span>Mở Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Key Metric Highlights Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Giá niêm yết
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-sky-700 block mt-0.5">
                    {formatVND(room.price)}
                  </span>
                  <span className="text-[10px] text-slate-500">/ tháng</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Tiền cọc
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-slate-800 block mt-0.5">
                    {formatVND(room.deposit)}
                  </span>
                  <span className="text-[10px] text-slate-500">Cọc 1 tháng</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Diện tích
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-slate-800 block mt-0.5">
                    {room.area} m²
                  </span>
                  <span className="text-[10px] text-slate-500">Thông thủy</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Sức chứa
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-slate-800 block mt-0.5">
                    {room.capacity} người
                  </span>
                  <span className="text-[10px] text-slate-500">Tối đa</span>
                </div>
              </div>

              {/* Room Description Narrative */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-2">
                  Mô tả không gian căn hộ
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {room.description}
                </p>
              </div>
            </div>

            {/* Room Amenities Section (Tiện nghi riêng) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Nội thất & Tiện nghi riêng trong phòng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tất cả các trang thiết bị dưới đây đều đã được trang bị sẵn và bàn giao khi bạn dọn vào.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {room.roomAmenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Building Amenities Section (Tiện nghi chung tòa nhà) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tiện ích chung của tòa nhà ({room.buildingName})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cơ sở vật chất hạ tầng đồng bộ, an ninh và phòng cháy chữa cháy an toàn.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {room.buildingAmenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100"
                  >
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transparent Public Services & Utility Pricing */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bảng giá dịch vụ sinh hoạt công khai
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Minh bạch 100%, ghi chỉ số hàng tháng qua công tơ đo đếm riêng biệt.
                </p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {publicServices.map((svc) => (
                  <div
                    key={svc.code}
                    className="p-4 bg-slate-50/60 hover:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {svc.name}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {svc.note}
                      </span>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <span className="text-xs font-extrabold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100 inline-block">
                        {svc.priceDisplay}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        / {svc.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Booking Form Box (Desktop Sticky) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-24 bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-7 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold text-sky-600 uppercase tracking-wider block">
                  Lên lịch hẹn trực tiếp
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  Đặt Lịch Xem Phòng Miễn Phí
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Nhân viên ban quản lý sẽ trực tiếp đón tiếp và dẫn bạn xem phòng thực tế.
                </p>
              </div>

              {/* Embedded Booking Form Component */}
              <BookingForm room={room} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sticky CTA Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl">
        <div>
          <span className="text-xs text-slate-400 block">Giá thuê niêm yết</span>
          <span className="text-base font-extrabold text-sky-700">
            {formatVND(room.price)}
          </span>
          <span className="text-[11px] text-slate-500">/tháng</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="tel:0901000001"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Gọi hotline"
          >
            <PhoneCall className="w-5 h-5 text-sky-600" />
          </a>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsBookingModalOpen(true)}
            icon={<Calendar className="w-4 h-4" />}
          >
            Đặt lịch xem ngay
          </Button>
        </div>
      </div>

      {/* Mobile Booking Dialog */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={`Đặt lịch hẹn xem phòng ${room.code}`}
        maxWidth="lg"
      >
        <BookingForm
          room={room}
          onCancel={() => setIsBookingModalOpen(false)}
          onSuccess={() => {}}
        />
      </Modal>
    </div>
  )
}
