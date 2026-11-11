import { Link } from 'react-router'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  KeyRound,
  PhoneCall,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { telHrefOf, usePublicSettings } from '@/lib/publicSettings'
import type { PublicRoom, PublicRoomOptions } from './types'

const fallbackBuildingPhotos = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
]

function extractDistrict(name: string): string {
  const parts = name.split('-')
  return parts.length > 1 ? parts[parts.length - 1].trim() : 'Hà Nội'
}

interface HomeInformationSectionsProps {
  options: PublicRoomOptions | null
  rooms: PublicRoom[]
  error: string
  onRetry: () => void
}

export function HomeInformationSections({ options, rooms, error, onRetry }: HomeInformationSectionsProps) {
  // Hotline lấy từ Cài đặt hệ thống, giống thanh điều hướng và chân trang.
  const contactPhone = usePublicSettings().contactPhone
  const telHref = telHrefOf(contactPhone)
  return (
    <>
      {/* 1. KHÁM PHÁ HỆ THỐNG TÒA NHÀ (Được đẩy lên cao để khách dễ chọn vị trí) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Hệ thống tòa nhà</span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Các Tòa Nhà Đang Có Phòng Trống
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Chọn tòa nhà gần trường học, nơi làm việc để xem danh sách phòng chi tiết.
          </p>
        </header>

        {error ? (
          <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <p>{error}</p>
            <Button variant="outline" onClick={onRetry}>Thử lại danh sách tòa nhà</Button>
          </div>
        ) : !options ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">Đang tải danh sách tòa nhà…</p>
        ) : options.buildings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có tòa nhà có phòng công khai.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {options.buildings.slice(0, 6).map((building, idx) => {
              const room = rooms.find((item) => item.building.id === building.id && item.photos.length > 0)
              const buildingAddress = rooms.find((item) => item.building.id === building.id)?.building.address
              const coverUrl = room?.photos[0]?.url ?? fallbackBuildingPhotos[idx % fallbackBuildingPhotos.length]
              return (
                <article key={building.id} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-lg transition-all">
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={coverUrl}
                      alt={room ? `Nội thất phòng ${room.code} tại ${building.name}` : building.name}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 rounded-lg bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 text-xs font-semibold text-white">
                      {extractDistrict(building.name)}
                    </div>
                    <div className="absolute bottom-3 right-3 rounded-lg bg-white/95 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                      Đang có phòng trống
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="break-words text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      {building.name}
                    </h3>
                    {buildingAddress && (
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-1">{buildingAddress}</p>
                    )}
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-600 line-clamp-2">
                      An ninh vân tay 2 lớp, camera giám sát 24/7, thang máy tốc độ cao và PCCC nghiệm thu.
                    </p>
                    <div className="mt-3 mb-5 space-y-1.5 border-t border-slate-100 pt-3">
                      {[
                        'Thang máy thẻ từ phân tầng',
                        'Khóa cửa vân tay & Camera 24/7',
                        'Hệ thống PCCC tự động đạt chuẩn',
                      ].map((amenity) => (
                        <div key={amenity} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Check className="size-3.5 shrink-0 text-teal-600" />
                          <span className="truncate">{amenity}</span>
                        </div>
                      ))}
                    </div>
                    <Link
                      to={`/rooms?building_id=${building.id}`}
                      className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50 hover:border-sky-300 transition-colors"
                    >
                      Xem các phòng trống
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {options && options.buildings.length > 6 && (
          <div className="mt-8 text-center">
            <Link to="/rooms" className="text-sm font-semibold text-sky-700 hover:underline inline-flex items-center gap-1.5">
              <span>Xem bộ lọc tất cả {options.buildings.length} tòa nhà</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </section>

      {/* 2. TIÊU CHUẨN KHÔNG GIAN SỐNG (WHY CHOOSE) */}
      <section className="border-y border-slate-200/80 bg-slate-50/80 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Tiêu chuẩn không gian sống</span>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Tại Sao Bạn Sẽ Thích Ở Tại MiniApart?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Tập trung vào trải nghiệm sống thực tế của cư dân: yên tĩnh, sạch sẽ, an toàn và chi phí rõ ràng.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <KeyRound aria-hidden="true" className="size-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Giờ giấc tự do & Khóa thông minh</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Tòa nhà hoàn toàn không chung chủ. Cửa cổng ra vào bằng mã số, vân tay và thẻ từ 2 lớp, camera giám sát 24/7 giúp bạn an tâm đi về bất cứ lúc nào.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Zap aria-hidden="true" className="size-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Đồng hồ điện nước riêng từng phòng</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Nói không với tình trạng chia bình quân vô lý. Mỗi phòng có công tơ điện tử và đồng hồ nước riêng, ghi chỉ số định kỳ ngày 1 hàng tháng minh bạch.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <ShieldCheck aria-hidden="true" className="size-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">Đội ngũ kỹ thuật hỗ trợ tận tâm</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Bảo trì định kỳ máy bơm, thang máy, mạng internet. Khi có sự cố thiết bị sinh hoạt, chỉ cần gửi yêu cầu trên hệ thống là nhân viên tiếp nhận xử lý ngay.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 3. BẢNG GIÁ DỊCH VỤ SINH HOẠT CÔNG KHAI */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-10">
          <header className="mb-8 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Minh bạch 100%</span>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Bảng Giá Dịch Vụ & Chi Phí Sinh Hoạt
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Các khoản chi phí sinh hoạt phát sinh được niêm yết rõ ràng trước khi ký hợp đồng, không phát sinh chi phí ẩn ngoài danh mục.
            </p>
          </header>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {[
              {
                title: 'Điện sinh hoạt',
                price: '3.500 đ',
                unit: 'kWh (số điện)',
                desc: 'Tính theo công tơ điện tử riêng biệt của từng phòng, chốt số công khai ngày 1 hàng tháng.',
              },
              {
                title: 'Nước sinh hoạt',
                price: '25.000 đ',
                unit: 'm³ (khối)',
                desc: 'Đồng hồ đo lưu lượng nước riêng, thanh toán theo khối lượng tiêu thụ thực tế.',
              },
              {
                title: 'Internet cáp quang',
                price: '100.000 đ',
                unit: 'phòng / tháng',
                desc: 'Wi-Fi tốc độ cao phủ sóng toàn tòa nhà, hỗ trợ kỹ thuật và bảo trì đường truyền định kỳ.',
              },
              {
                title: 'Dịch vụ chung & Vệ sinh',
                price: '120.000 đ',
                unit: 'người / tháng',
                desc: 'Chi phí dọn dẹp hành lang, điện chiếu sáng công cộng, bảo trì thang máy và camera an ninh.',
              },
              {
                title: 'Gửi xe máy',
                price: '100.000 đ',
                unit: 'xe / tháng',
                desc: 'Khu vực để xe tầng 1 an toàn, ra vào quẹt thẻ từ / vân tay 2 lớp chống trộm.',
              },
              {
                title: 'Máy giặt sấy chung',
                price: 'Miễn phí',
                unit: 'khu giặt chung',
                desc: 'Khu vực sân thượng có máy giặt dùng chung và sân phơi có mái che thoáng gió.',
              },
            ].map((svc) => (
              <div
                key={svc.title}
                className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-5 hover:bg-white hover:border-sky-200 hover:shadow-xs transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{svc.title}</h3>
                  <span className="inline-block shrink-0 whitespace-nowrap rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-sky-800">
                    {svc.price}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Đơn vị tính: <span className="font-semibold text-slate-700">{svc.unit}</span>
                </p>
                <p className="text-sm leading-relaxed text-slate-600">{svc.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>Mọi khoản chi phí được thỏa thuận cụ thể và quy định bằng văn bản trong hợp đồng thuê nhà.</span>
          </div>
        </div>
      </section>

      {/* 4. QUY TRÌNH 4 BƯỚC NHẬN PHÒNG */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Quy trình thuê phòng</span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            4 Bước Đơn Giản Để Nhận Phòng
          </h2>
          <p className="mt-2 text-sm text-slate-500">Nhanh gọn, tiện lợi và tôn trọng thời gian của bạn.</p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Chọn phòng phù hợp',
              description: 'Xem chi tiết ảnh thật 100%, giá thuê, diện tích và tiện nghi các phòng đang còn trống trên website.',
              note: 'Khảo sát trực tuyến',
            },
            {
              title: 'Đặt lịch xem phòng',
              description: 'Điền ngày giờ rảnh của bạn và số điện thoại. Hoàn toàn miễn phí, không mất bất kỳ khoản cọc giữ chỗ nào.',
              note: 'Chỉ mất 30 giây',
            },
            {
              title: 'Đến xem trực tiếp',
              description: 'Nhân viên quản lý tòa nhà đón tiếp, mở cửa phòng và giải đáp mọi thắc mắc về nội quy, dịch vụ.',
              note: 'Xem tận mắt, sờ tận tay',
            },
            {
              title: 'Ký hợp đồng & Nhận phòng',
              description: 'Ký hợp đồng thuê rõ ràng, bàn giao chìa khóa, cài đặt vân tay và bạn có thể dọn đồ vào ở ngay.',
              note: 'Bảo vệ quyền lợi đôi bên',
            },
          ].map((step, index) => (
            <article key={step.title} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div>
                <span className={`mb-4 flex size-9 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm ${index === 3 ? 'bg-emerald-600' : 'bg-sky-600'}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mb-2 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-sky-700">{step.note}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-sky-700 to-teal-700 p-8 text-white shadow-xl sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border-40 border-white/5" />
          <div className="relative max-w-2xl">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Tìm Thấy Căn Phòng Ưng Ý?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sky-100 sm:text-base">
              Đặt lịch hẹn xem phòng trực tiếp ngay hôm nay để trải nghiệm không gian sống thực tế. Ban quản lý sẵn sàng hỗ trợ từ 08:00 – 20:00 hàng ngày.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/rooms">
                <Button variant="secondary" className="bg-white text-sky-800 hover:bg-sky-50 font-semibold" icon={<Search className="size-4" />}>
                  Xem danh sách phòng trống
                </Button>
              </Link>
              {telHref && <a
                href={telHref}
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <PhoneCall className="size-4" />
                Hotline: {contactPhone}
              </a>}
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <FileText className="size-4" />
                Liên hệ & Tòa nhà
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-sky-100">
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
              Chính chủ 100% · Không mất phí môi giới · Hợp đồng minh bạch
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
