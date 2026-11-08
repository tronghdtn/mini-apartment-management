import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Clock, ExternalLink, HelpCircle, Mail, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { getCachedPublicRoomOptions, getCachedPublicRooms, getPublicRoomOptions, getPublicRooms } from '@/features/rooms/api'
import { emptyRoomFilters } from '@/features/rooms/schemas'
import type { PublicRoom, PublicRoomOptions } from '@/features/rooms/types'
import { apiErrorMessage } from '@/lib/apiErrors'
import { usePublicSettings } from '@/lib/publicSettings'

const fallbackBuildingPhotos = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
]

function extractDistrict(name: string): string {
  const parts = name.split('-')
  return parts.length > 1 ? parts[parts.length - 1].trim() : 'Hà Nội'
}

const faqs = [
  {
    q: 'Tiền cọc khi thuê phòng là bao nhiêu?',
    a: 'Tiền cọc thông thường tương đương 01 tháng tiền phòng (niêm yết rõ tại chi tiết từng phòng). Khoản cọc này được giữ bảo đảm trong suốt thời gian hiệu lực của hợp đồng và sẽ được đối soát hoàn trả đầy đủ khi hai bên thanh lý hợp đồng bàn giao phòng.',
  },
  {
    q: 'Thời hạn hợp đồng thuê phòng tối thiểu là bao lâu?',
    a: 'Hệ thống áp dụng hợp đồng linh hoạt 06 tháng hoặc 12 tháng tùy theo nhu cầu của khách thuê. Thời hạn và các điều khoản được thỏa thuận minh bạch trong hợp đồng.',
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
    q: 'Tôi có thể đặt lịch xem phòng trực tuyến vào khung giờ nào?',
    a: 'Bạn có thể mở phòng đang cho thuê và chọn Đặt lịch xem phòng tất cả các ngày trong tuần trong khung giờ 08:00 – 20:00 (giờ Việt Nam). Quản trị viên sẽ xác nhận lịch hẹn để đón tiếp chu đáo.',
  },
]

export function ContactPage() {
  const siteSettings = usePublicSettings()
  const contactPhone = siteSettings.contactPhone || '0901.000.001'
  const contactEmail = siteSettings.contactEmail || 'hotro@miniapartment.vn'
  const telHref = `tel:${contactPhone.replace(/[^0-9+]/g, '')}`
  const [buildings, setBuildings] = useState<PublicRoomOptions['buildings'] | null>(
    () => getCachedPublicRoomOptions()?.buildings ?? null,
  )
  const [rooms, setRooms] = useState<PublicRoom[]>(
    () => getCachedPublicRooms(1, emptyRoomFilters)?.data ?? [],
  )
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [selectedMap, setSelectedMap] = useState<{ name: string; address: string; mapUrl: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getPublicRoomOptions(controller.signal),
      getPublicRooms(1, emptyRoomFilters, controller.signal).catch(() => null),
    ])
      .then(([optionsData, roomsData]) => {
        if (!controller.signal.aborted) {
          setBuildings(optionsData.buildings)
          if (roomsData) setRooms(roomsData.data)
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(apiErrorMessage(failure))
      })
    return () => controller.abort()
  }, [revision])

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Page Header */}
      <header className="mx-auto max-w-2xl space-y-2 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
          Thông tin liên hệ
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Hệ Thống Tòa Nhà & Hỗ Trợ Khách Hàng
        </h1>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-500">
          Chúng tôi luôn sẵn sàng hỗ trợ bạn tìm kiếm căn phòng phù hợp nhất. Liên hệ trực tiếp với ban quản trị hoặc ghé thăm các cơ sở tòa nhà.
        </p>
      </header>

      {/* Main Contact Highlights */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <Phone className="size-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Hotline tư vấn</h2>
            <p className="mt-0.5 text-xs text-slate-500">08:00 – 20:00 hàng ngày · Lịch xem phòng & giải đáp</p>
            <a
              href={telHref}
              className="mt-2 block text-base font-extrabold text-sky-700 hover:underline"
            >
              {contactPhone}
            </a>
          </div>
        </section>

        <section className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Mail className="size-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Hòm thư điện tử</h2>
            <p className="mt-0.5 text-xs text-slate-500">Gửi ý kiến đóng góp & hợp tác</p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-2 block text-sm font-bold text-teal-700 hover:underline"
            >
              {contactEmail}
            </a>
          </div>
        </section>

        <section className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Clock className="size-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Thời gian tiếp đón</h2>
            <p className="mt-0.5 text-xs text-slate-500">Tất cả các ngày trong tuần</p>
            <span className="mt-2 block text-sm font-bold text-emerald-700">
              08:00 – 20:00 hàng ngày
            </span>
          </div>
        </section>
      </div>

      {/* Building Branches Detailed Directory */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Danh Sách Cơ Sở Chung Cư Mini
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Các tòa nhà thuộc quyền quản lý trực tiếp của hệ thống MiniApart
          </p>
        </div>

        {error ? (
          <div role="alert" className="space-y-3 rounded-2xl bg-rose-50 p-5 text-sm text-rose-800">
            <p>{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setError('')
                setBuildings(null)
                setRevision((value) => value + 1)
              }}
            >
              Thử lại
            </Button>
          </div>
        ) : buildings === null ? (
          <p role="status" className="text-sm text-slate-500">
            Đang tải danh sách tòa nhà…
          </p>
        ) : buildings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Chưa có tòa nhà có phòng công khai.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {buildings.map((building, idx) => {
              const buildingRooms = rooms.filter((r) => r.building.id === building.id)
              const sampleRoom = buildingRooms.find((r) => r.photos.length > 0) ?? buildingRooms[0]
              const coverImage =
                sampleRoom?.photos[0]?.url ?? fallbackBuildingPhotos[idx % fallbackBuildingPhotos.length]
              const address = sampleRoom?.building.address || `${building.name}, Hà Nội`
              const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

              return (
                <article
                  key={building.id}
                  className="flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs transition-all hover:shadow-md"
                >
                  <div>
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img
                        src={coverImage}
                        alt={building.name}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                      <div className="absolute top-3 left-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                        {extractDistrict(building.name)}
                      </div>
                    </div>

                    <div className="space-y-3 p-6">
                      <h3 className="break-words text-base font-bold text-slate-900">
                        {building.name}
                      </h3>

                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-sky-600" />
                        <span>{address}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone className="size-4 shrink-0 text-sky-600" />
                        <span>
                          Hotline quản lý tòa: <strong>{contactPhone}</strong>
                        </span>
                      </div>

                      <p className="border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-500">
                        Tòa nhà chung cư mini hiện đại, trang bị thang máy tốc độ cao, khóa vân tay 2 lớp, camera an ninh 24/7 và hệ thống PCCC tiêu chuẩn.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 p-6 pt-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setSelectedMap({ name: building.name, address, mapUrl })}
                    >
                      Xem bản đồ
                    </Button>
                    <Link to={`/rooms?building_id=${building.id}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full text-xs">
                        Xem phòng tại tòa nhà
                      </Button>
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Embedded Map Modal */}
      {selectedMap && (
        <Modal
          isOpen={!!selectedMap}
          onClose={() => setSelectedMap(null)}
          size="lg"
          title={`Vị trí & bản đồ — ${selectedMap.name}`}
        >
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-700 shrink-0" />
              <span>Địa chỉ: {selectedMap.address}</span>
              <a
                href={selectedMap.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 font-semibold underline hover:text-sky-800"
              >
                Xem bản đồ lớn
              </a>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-80 sm:h-96">
              <a
                href={selectedMap.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-sky-700 shadow-md border border-slate-200/80 hover:bg-slate-50 transition-colors"
              >
                <span>Mở trong Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <iframe
                title={`Bản đồ ${selectedMap.name}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedMap.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Frequently Asked Questions (FAQs) */}
      <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-6 sm:p-10">
        <header>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
            Hỏi đáp phổ biến
          </span>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Những Câu Hỏi Khách Thuê Thường Quan Tâm
          </h2>
        </header>
        <div className="divide-y divide-slate-200">
          {faqs.map((faq) => (
            <div key={faq.q} className="py-4">
              <h3 className="flex items-start gap-2 text-sm font-bold text-slate-900">
                <HelpCircle className="mt-0.5 size-4 shrink-0 text-sky-600" />
                <span>{faq.q}</span>
              </h3>
              <p className="mt-2 pl-6 text-xs leading-relaxed text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
