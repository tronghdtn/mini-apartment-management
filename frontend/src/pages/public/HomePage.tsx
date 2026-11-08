import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Search, Sparkles, ArrowRight, Building2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { RoomCard } from '@/features/rooms/RoomCard'
import { HomeInformationSections } from '@/features/rooms/HomeInformationSections'
import { AppointmentBookingForm } from '@/features/viewing-appointments/AppointmentBookingForm'
import { getCachedPublicRoomOptions, getCachedPublicRooms, getPublicRoomOptions, getPublicRooms } from '@/features/rooms/api'
import { roomPriceRanges } from '@/features/rooms/ranges'
import { emptyRoomFilters, roomSearch } from '@/features/rooms/schemas'
import type { PublicRoom, PublicRoomOptions, PublicRoomPage } from '@/features/rooms/types'
import { apiErrorMessage } from '@/lib/apiErrors'

export function HomePage() {
  const navigate = useNavigate()
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedPrice, setSelectedPrice] = useState('')
  const [result, setResult] = useState<PublicRoomPage | null>(() =>
    getCachedPublicRooms(1, { ...emptyRoomFilters, sort: 'price_asc' }),
  )
  const [options, setOptions] = useState<PublicRoomOptions | null>(() =>
    getCachedPublicRoomOptions(),
  )
  const [error, setError] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const [revision, setRevision] = useState(0)
  const [bookingRoom, setBookingRoom] = useState<PublicRoom | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    getPublicRooms(1, { ...emptyRoomFilters, sort: 'price_asc' }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
    getPublicRoomOptions(controller.signal)
      .then(data => { if (!controller.signal.aborted) setOptions(data) })
      .catch(failure => { if (!controller.signal.aborted) setOptionsError(apiErrorMessage(failure)) })
    return () => controller.abort()
  }, [revision])
  const searchRooms = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const range = roomPriceRanges.find(([name]) => name === selectedPrice)
    const search = roomSearch({
      ...emptyRoomFilters,
      building_id: selectedBuilding,
      min_price: range?.[1] ?? '',
      max_price: range?.[2] ?? '',
    })
    navigate({ pathname: '/rooms', search: search.toString() })
  }
  const reload = () => { setError(''); setOptionsError(''); setResult(null); setOptions(null); setRevision(value => value + 1) }
  return <div className="space-y-16 sm:space-y-24 pb-16">
    {/* 1. HERO BANNER */}
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white shadow-2xl">
        {/* Background Apartment Photo Overlay */}
        <div className="absolute inset-0 z-0 opacity-20 mix-blend-luminosity">
          <img
            src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80"
            alt="Mini Apartment Interior"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Ambient Glow Lights */}
        <div aria-hidden="true" className="absolute top-0 right-0 w-80 h-80 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16 lg:py-20 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold uppercase tracking-wider mb-5 backdrop-blur-md">
            <Sparkles aria-hidden="true" className="w-4 h-4" />
            <span>Hệ thống chung cư mini chính chủ</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Không Gian Sống Tiện Nghi, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-sky-200 to-teal-300">
              Tự Do & An Ninh 24/7
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Căn hộ mini & studio khép kín đủ đồ tiện nghi. Hình ảnh thực tế 100%, giá thuê niêm yết minh bạch, hợp đồng trực tiếp không qua trung gian.
          </p>

          <form onSubmit={searchRooms} className="mt-8 p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/20 text-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-xl">
            <div>
              <label htmlFor="home-building" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tòa nhà</label>
              <select id="home-building" value={selectedBuilding} disabled={!options} onChange={event => setSelectedBuilding(event.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 outline-none">
                <option value="">Tất cả tòa nhà</option>
                {options?.buildings.map(building => <option key={building.id} value={building.id}>
                  {building.name}
                </option>)}
              </select>
            </div>
            <div>
              <label htmlFor="home-price" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Ngân sách thuê</label>
              <select id="home-price" value={selectedPrice} onChange={event => setSelectedPrice(event.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium text-slate-800 focus:border-sky-500 outline-none">
                <option value="">Tất cả mức giá</option>
                {roomPriceRanges.map(([name]) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full h-[42px] font-semibold" icon={<Search aria-hidden="true" className="w-4 h-4" />}>Tìm phòng ngay</Button>
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

          {optionsError && <div role="alert" className="mt-4 text-sm text-amber-200">
            <p>Chưa tải được danh sách tòa nhà. {optionsError}</p>
            <button type="button" onClick={reload} className="underline py-2">Thử lại</button>
          </div>}
        </div>
      </div>
    </section>

    {/* 2. FEATURED ROOMS */}
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Phòng trống mới nhất</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Căn Hộ Sẵn Sàng Dọn Vào Ở Ngay</h2>
          <p className="text-sm text-slate-500 mt-1">Các phòng đã hoàn thiện dọn dẹp, kiểm tra kỹ thuật điện nước và khóa thông minh.</p>
        </div>
        <Link to="/rooms">
          <Button variant="outline" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
            Xem tất cả ({result ? result.meta.total : 0} phòng)
          </Button>
        </Link>
      </div>
      {error ? <div role="alert" className="rounded-2xl bg-rose-50 border border-rose-200 p-5 space-y-3">
        <p className="text-sm text-rose-700">{error}</p>
        <Button variant="outline" onClick={reload}>Thử lại</Button>
      </div> : !result ? <p role="status" className="text-slate-500 py-8 text-center">Đang tải phòng cho thuê…</p> : result.data.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {result.data.slice(0, 6).map(room => (
          <RoomCard
            key={room.id}
            room={room}
            featured={true}
            onBookClick={(r) => setBookingRoom(r)}
          />
        ))}
      </div> : <div className="rounded-3xl bg-white border border-slate-200 p-10 text-center text-slate-500">
        <Building2 aria-hidden="true" className="w-10 h-10 mx-auto mb-3 text-slate-400" />
        <p>Hiện chưa có phòng công khai đang cho thuê.</p>
      </div>}
    </section>

    {/* 3. INFORMATION SECTIONS */}
    <HomeInformationSections options={options} rooms={result?.data ?? []} error={optionsError} onRetry={reload} />

    {/* Quick Booking Modal */}
    {bookingRoom && (
      <Modal
        isOpen={!!bookingRoom}
        onClose={() => setBookingRoom(null)}
        size="lg"
        title={`Đặt lịch xem phòng ${bookingRoom.code}`}
      >
        <div className="p-4 sm:p-6">
          <AppointmentBookingForm
            roomId={String(bookingRoom.id)}
            room={bookingRoom}
            onSuccess={() => {
              // keep modal open to show success view, or can close after
            }}
          />
        </div>
      </Modal>
    )}
  </div>
}
