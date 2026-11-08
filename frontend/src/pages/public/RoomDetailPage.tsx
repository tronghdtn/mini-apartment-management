import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useParams } from 'react-router'
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MapPin,
  PhoneCall,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { getCachedPublicRoom, getPublicRoom } from '@/features/rooms/api'
import { RoomGallery } from '@/features/rooms/RoomGallery'
import { AppointmentBookingForm } from '@/features/viewing-appointments/AppointmentBookingForm'
import type { PublicRoom } from '@/features/rooms/types'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { usePublicSettings } from '@/lib/publicSettings'


export function RoomDetailPage() {
  // Hotline lấy từ Cài đặt hệ thống, giống thanh điều hướng và chân trang.
  const contactPhone = usePublicSettings().contactPhone
  const telHref = `tel:${contactPhone.replace(/[^0-9+]/g, '')}`
  const { roomId = '' } = useParams<{ roomId: string }>()
  const [revision, setRevision] = useState(0)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const key = `${roomId}:${revision}`
  const [response, setResponse] = useState<{
    key: string
    room?: PublicRoom
    error?: string
    missing?: boolean
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getPublicRoom(roomId, controller.signal)
      .then((room) => {
        if (!controller.signal.aborted) setResponse({ key, room })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResponse({
            key,
            error: apiErrorMessage(error),
            missing: isAxiosError(error) && error.response?.status === 404,
          })
        }
      })
    return () => controller.abort()
  }, [roomId, key])

  const cachedRoom = getCachedPublicRoom(roomId)
  const current = response?.key === key ? response : cachedRoom ? { key, room: cachedRoom } : null
  const room = current?.room

  if (!current) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p role="status" className="mt-4 text-sm text-slate-500 font-medium">
          Đang tải thông tin chi tiết căn hộ…
        </p>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {current.missing ? 'Phòng Này Hiện Không Nhận Lịch Xem' : 'Chưa tải được thông tin phòng'}
        </h1>
        <p role="alert" className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {current.error ||
            'Căn phòng bạn đang tìm có thể đã có khách đặt cọc hoặc đang trong giai đoạn cập nhật thông tin. Hãy tham khảo các căn phòng trống khác.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {!current.missing && (
            <Button variant="outline" size="md" onClick={() => setRevision((v) => v + 1)}>
              Thử lại
            </Button>
          )}
          <Link to="/rooms">
            <Button variant="primary" size="md">
              Xem danh sách phòng trống khác
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${room.building.name}, ${room.building.address}`
  )}`

  return (
    <div className="pb-24 sm:pb-16">
      {/* Breadcrumb Navigation Bar */}
      <div className="bg-white border-b border-slate-100 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Đường dẫn"
            className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap"
          >
            <Link to="/" className="hover:text-slate-900 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Link to="/rooms" className="hover:text-slate-900 transition-colors">
              Danh sách phòng
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-700 font-medium">{room.building.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-900 font-bold">Phòng {room.code}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Main Grid: Left Details & Right Booking Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* LEFT COLUMN: Gallery & Specifications (7 or 8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* Interactive Image Gallery */}
            {room.photos.length > 0 ? (
              <RoomGallery
                key={room.photos.map((p) => p.id).join(',')}
                images={room.photos.map((p) => p.url)}
                title={`Phòng ${room.code}`}
              />
            ) : (
              <div className="aspect-[16/9] bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Building2 className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-medium">Chưa có ảnh phòng</p>
              </div>
            )}

            {/* Room Primary Header & Specs */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-6 shadow-xs">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Còn trống — Sẵn sàng bàn giao
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                    Tầng {room.floor_number}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold">
                    Phòng {room.code}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {room.description && room.description.includes('\n\n')
                    ? `${room.description.split('\n\n')[0].trim()} — Phòng ${room.code}`
                    : `Phòng ${room.code} — ${room.building.name}`}
                </h1>

                {/* Building Location & Google Maps Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="font-medium">{room.building.name} • {room.building.address}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs sm:text-sm font-semibold hover:bg-sky-100 transition-colors cursor-pointer shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    <span>Xem bản đồ vị trí</span>
                  </button>
                </div>
              </div>

              {/* Key Metric Highlights Cards (4 Cards Grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100">
                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Giá niêm yết
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-sky-700 block mt-0.5">
                    {formatVND(room.base_price)}
                  </span>
                  <span className="text-xs text-slate-500">/ tháng</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Tiền cọc
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-slate-800 block mt-0.5">
                    {formatVND(room.deposit_amount)}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold text-emerald-700">Cọc 1 tháng</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Diện tích
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-slate-800 block mt-0.5">
                    {room.area} m²
                  </span>
                  <span className="text-xs text-slate-500">Thông thủy</span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Sức chứa
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-slate-800 block mt-0.5">
                    {room.max_occupants} người
                  </span>
                  <span className="text-xs text-slate-500">Tối đa</span>
                </div>
              </div>

              {/* Room Description Narrative */}
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 mb-2">
                  Mô tả không gian căn hộ
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
                  {(room.description && room.description.includes('\n\n')
                    ? room.description.split('\n\n').slice(1).join('\n\n').trim()
                    : room.description) ||
                    'Căn hộ mini thiết kế hiện đại, thông thoáng, đầy đủ tiện nghi thiết yếu. Phòng đã được kiểm tra kỹ thuật điện nước và vệ sinh sạch sẽ sẵn sàng dọn vào ở ngay.'}
                </p>
              </div>
            </div>

            {/* Room Amenities Section (Tiện nghi riêng) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 space-y-4 shadow-xs">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Nội thất & Tiện nghi riêng trong phòng
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">
                  Tất cả các trang thiết bị dưới đây đều đã được trang bị sẵn và bàn giao khi bạn dọn vào.
                </p>
              </div>

              {room.amenities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {room.amenities.map((amenity) => (
                    <div
                      key={amenity.id}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/70"
                    >
                      <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[13px] font-semibold text-slate-800 block">{amenity.name}</span>
                        {amenity.description && (
                          <span className="text-xs text-slate-500 block mt-0.5 leading-snug">
                            {amenity.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 pt-2">Đang cập nhật danh mục tiện nghi cụ thể.</p>
              )}
            </div>

            {/* Building Location & Interactive Map Section */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 space-y-4 shadow-xs">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Vị trí & Bản đồ
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                  <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>
                    Địa chỉ: <strong className="font-semibold text-slate-800">{room.building.address}</strong> ({room.building.name})
                  </span>
                </p>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-72 sm:h-80">
                <iframe
                  title={`Bản đồ ${room.building.name}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    `${room.building.address}, Hà Nội`
                  )}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Booking Form Box (Desktop Sticky) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-20 bg-white rounded-3xl border border-slate-200/90 shadow-xl p-5 sm:p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-sky-600 uppercase tracking-wider block">
                  Lên lịch hẹn trực tiếp
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  Đặt Lịch Xem Phòng Miễn Phí
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhân viên ban quản lý sẽ trực tiếp đón tiếp và dẫn bạn xem phòng thực tế.
                </p>
              </div>

              {/* Embedded Booking Form Component (compact mode so it fits 100% in viewport) */}
              <AppointmentBookingForm roomId={String(room.id)} room={room} compact />

              <div className="pt-2 border-t border-slate-100">
                <a
                  href={telHref}
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-sky-600" />
                  <span>Hotline tư vấn: {contactPhone}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sticky CTA Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl">
        <div>
          <span className="text-xs text-slate-500 block">Giá thuê niêm yết</span>
          <span className="text-lg font-extrabold text-sky-700">{formatVND(room.base_price)}</span>
          <span className="text-xs text-slate-500 ml-1">/tháng</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={telHref}
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
        size="lg"
      >
        <div className="p-4 sm:p-6">
          <AppointmentBookingForm
            roomId={String(room.id)}
            room={room}
            onSuccess={() => setIsBookingModalOpen(false)}
          />
        </div>
      </Modal>

      {/* Location Map Modal (loads iframe only on demand when user clicks Xem bản đồ) */}
      <Modal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title={`Vị trí & bản đồ — ${room.building.name}`}
        size="lg"
      >
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600">
            <MapPin className="w-4 h-4 text-slate-700 shrink-0" />
            <span>Địa chỉ: {room.building.address}</span>
            <a
              href={mapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 font-semibold underline hover:text-sky-800"
            >
              Xem bản đồ lớn
            </a>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-80 sm:h-96">
            <a
              href={mapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-sky-700 shadow-md border border-slate-200/80 hover:bg-slate-50 transition-colors"
            >
              <span>Mở trong Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <iframe
              title={`Bản đồ ${room.building.name}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(room.building.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
