import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  PhoneCall,
  Check,
} from 'lucide-react'
import { buildings, rooms, publicServices } from '@/mocks/data'
import { RoomCard } from '@/features/rooms/RoomCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { BookingForm } from '@/features/rooms/BookingForm'
import type { Room } from '@/mocks/types'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()

  // Quick Search State in Hero
  const [selectedBuilding, setSelectedBuilding] = useState('all')
  const [selectedPrice, setSelectedPrice] = useState('all')

  // Booking Modal State
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null)

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (selectedBuilding !== 'all') params.set('buildingId', selectedBuilding)
    if (selectedPrice !== 'all') params.set('priceRange', selectedPrice)
    navigate(`/rooms?${params.toString()}`)
  }

  const featuredRooms = rooms.filter((r) => r.featured && r.status === 'available')

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white shadow-2xl">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0 opacity-25 mix-blend-luminosity">
              <img
                src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80"
                alt="Mini Apartment Hero"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Glowing Accent Orbs */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16 lg:py-20 max-w-4xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold uppercase tracking-wider mb-5 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hệ thống chung cư mini chính chủ</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Không Gian Sống Tiện Nghi, <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-sky-200 to-teal-300">
                  Tự Do & An Ninh 24/7
                </span>
              </h1>

              {/* Description */}
              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Căn hộ mini & studio khép kín đủ đồ tại Hà Đông, Hai Bà Trưng và Cầu Giấy.
                Hình ảnh thực tế 100%, giá thuê niêm yết minh bạch, hợp đồng trực tiếp không qua trung gian.
              </p>

              {/* Quick Search Form */}
              <form
                onSubmit={handleQuickSearch}
                className="mt-8 p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl text-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 border border-white/20"
              >
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Khu vực / Tòa nhà
                  </label>
                  <select
                    value={selectedBuilding}
                    onChange={(e) => setSelectedBuilding(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 outline-none"
                  >
                    <option value="all">Tất cả tòa nhà (Hà Nội)</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id.toString()}>
                        {b.name} — {b.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Ngân sách thuê
                  </label>
                  <select
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 outline-none"
                  >
                    <option value="all">Tất cả mức giá</option>
                    <option value="under-3.5m">Dưới 3.5 triệu / tháng</option>
                    <option value="3.5m-4.5m">3.5 - 4.5 triệu / tháng</option>
                    <option value="above-4.5m">Trên 4.5 triệu / tháng</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full h-[38px] text-xs font-semibold"
                    icon={<Search className="w-3.5 h-3.5" />}
                  >
                    Tìm phòng ngay
                  </Button>
                </div>
              </form>

              {/* Trust Badges */}
              <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Không chung chủ
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Khóa vân tay an toàn
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  PCCC nghiệm thu
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Xem phòng miễn phí
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED ROOMS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Phòng trống mới nhất</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Căn Hộ Sẵn Sàng Dọn Vào Ở Ngay
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Các phòng đã hoàn thiện dọn dẹp, kiểm tra kỹ thuật điện nước và khóa thông minh.
            </p>
          </div>

          <Link to="/rooms">
            <Button variant="outline" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
              Xem tất cả ({rooms.filter((r) => r.status === 'available').length} phòng)
            </Button>
          </Link>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onBookClick={(r) => setBookingRoom(r)}
            />
          ))}
        </div>
      </section>

      {/* 3. WHY CHOOSE MINIAPART (KEY FEATURES) */}
      <section className="bg-slate-50/80 py-16 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
              Tiêu chuẩn không gian sống
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Tại Sao Bạn Sẽ Thích Ở Tại MiniApart?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Chúng tôi tập trung vào trải nghiệm sống thực tế của cư dân: yên tĩnh, sạch sẽ, an toàn và chi phí rõ ràng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Giờ giấc tự do & Khóa thông minh
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tòa nhà hoàn toàn không chung chủ. Cửa cổng ra vào bằng mã số, vân tay và thẻ từ 2 lớp, camera giám sát 24/7 giúp bạn an tâm về bất cứ lúc nào.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Đồng hồ điện nước riêng từng phòng
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nói không với tình trạng chia bình quân vô lý. Mỗi phòng có công tơ điện tử và đồng hồ nước riêng, ghi chỉ số định kỳ ngày 1 hàng tháng minh bạch.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Đội ngũ kỹ thuật hỗ trợ tận tâm
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bảo trì định kỳ máy bơm, thang máy, mạng internet. Khi có sự cố hỏng vòi nước hay điều hòa, chỉ cần gửi yêu cầu là nhân viên kỹ thuật xử lý nhanh chóng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TRANSPARENT PUBLIC SERVICES & FEES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
              Minh bạch 100%
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Bảng Giá Dịch Vụ & Chi Phí Sinh Hoạt
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Tất cả các chi phí sinh hoạt phát sinh đều được công khai trước khi bạn ký hợp đồng. Không có bất kỳ chi phí phát sinh nào ngoài danh mục này.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {publicServices.map((svc) => (
              <div
                key={svc.code}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-sky-200 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-slate-900">{svc.name}</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-800">
                    {svc.priceDisplay}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mb-2">
                  Đơn vị tính: <span className="text-slate-700">{svc.unit}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {svc.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PROCESS: 4 STEPS TO YOUR NEW ROOM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
            Quy trình thuê phòng
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            4 Bước Đơn Giản Để Nhận Phòng
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Nhanh gọn, tiện lợi và tôn trọng thời gian của bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Step 1 */}
          <div className="relative p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="w-9 h-9 rounded-xl bg-sky-600 text-white font-extrabold text-sm flex items-center justify-center mb-4 shadow-sm">
                01
              </span>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Chọn phòng phù hợp
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Xem chi tiết ảnh thật, giá thuê, diện tích và tiện nghi các phòng đang còn trống trên website.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-sky-600 font-semibold flex items-center gap-1">
              <span>Khảo sát trực tuyến</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="w-9 h-9 rounded-xl bg-sky-600 text-white font-extrabold text-sm flex items-center justify-center mb-4 shadow-sm">
                02
              </span>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Đặt lịch xem phòng
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Điền ngày giờ rảnh của bạn và số điện thoại. Hoàn toàn miễn phí, không cần đặt cọc trước.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-sky-600 font-semibold flex items-center gap-1">
              <span>Chỉ mất 30 giây</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="w-9 h-9 rounded-xl bg-sky-600 text-white font-extrabold text-sm flex items-center justify-center mb-4 shadow-sm">
                03
              </span>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Đến xem trực tiếp
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhân viên quản lý tòa nhà đón tiếp, mở cửa phòng và giải đáp mọi thắc mắc về nội quy, dịch vụ.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-sky-600 font-semibold flex items-center gap-1">
              <span>Xem tận mắt, sờ tận tay</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center mb-4 shadow-sm">
                04
              </span>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Ký hợp đồng & Nhận phòng
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ký hợp đồng thuê rõ ràng, bàn giao chìa khóa, cài đặt vân tay và bạn có thể dọn đồ vào ở ngay.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span>Bảo vệ quyền lợi đôi bên</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SYSTEM BUILDINGS SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
            Địa điểm thuận tiện
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Các Tòa Nhà Thuộc Hệ Thống MiniApart
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Tọa lạc tại các quận trung tâm, gần nhiều trường đại học lớn, khu văn phòng và tuyến giao thông huyết mạch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {buildings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img
                  src={b.coverImage}
                  alt={b.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold">
                  {b.district}
                </div>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold">
                  {b.availableRooms} phòng trống
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{b.name}</h3>
                  <p className="text-xs text-slate-500 mb-3">{b.address}</p>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                    {b.description}
                  </p>

                  <div className="space-y-1.5 pt-3 border-t border-slate-100">
                    {b.buildingAmenities.slice(0, 3).map((amenity, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100">
                  <Link to={`/rooms?buildingId=${b.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Xem các phòng tại {b.name}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. BOTTOM CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-sky-600 via-sky-700 to-teal-700 p-8 sm:p-12 text-white shadow-xl overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tìm Thấy Căn Phòng Ưng Ý?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-sky-100 leading-relaxed">
              Hãy đặt lịch hẹn ngay hôm nay để nhân viên giữ phòng và chuẩn bị đón tiếp bạn chu đáo nhất. Không mất phí, xem phòng thoải mái.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/rooms">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-sky-800 hover:bg-sky-50 shadow-md font-bold"
                  icon={<Search className="w-4 h-4" />}
                >
                  Xem danh sách phòng trống
                </Button>
              </Link>

              <a href="tel:0901000001">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/40 text-white hover:bg-white/10"
                  icon={<PhoneCall className="w-4 h-4" />}
                >
                  Hotline: 0901.000.001
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Modal on Homepage */}
      {bookingRoom && (
        <Modal
          isOpen={true}
          onClose={() => setBookingRoom(null)}
          title={`Đặt lịch xem phòng ${bookingRoom.code}`}
          maxWidth="lg"
        >
          <BookingForm
            room={bookingRoom}
            onCancel={() => setBookingRoom(null)}
            onSuccess={() => {}}
          />
        </Modal>
      )}
    </div>
  )
}
