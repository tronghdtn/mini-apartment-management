import { Link } from 'react-router'
import { ArrowRight, Building2, CheckCircle2, FileText, Search, Sparkles, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { PublicRoomOptions } from './types'

interface HomeInformationSectionsProps {
  options: PublicRoomOptions | null
  error: string
  onRetry: () => void
}

// Antigravity Home sections 3–7, adjusted to information actually published by the system.
export function HomeInformationSections({ options, error, onRetry }: HomeInformationSectionsProps) {
  return <>
    <section className="border-y border-slate-200/80 bg-slate-50/80 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Tìm hiểu trước khi thuê</span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Chọn Không Gian Sống Theo Nhu Cầu</h2>
          <p className="mt-2 text-sm text-slate-500">Đối chiếu thông tin từng phòng để lựa chọn phù hợp với bạn.</p>
        </header>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { Icon: Search, title: 'Tìm phòng theo tiêu chí', description: 'Lọc theo tòa nhà, giá thuê, diện tích, sức chứa và tiện nghi. Kết quả chỉ gồm phòng đang công khai và còn trống.', color: 'bg-sky-50 text-sky-600' },
            { Icon: Wallet, title: 'Xem giá thuê và tiền cọc', description: 'Giá niêm yết và tiền cọc hiển thị riêng theo từng phòng. Các điều khoản áp dụng phải được thỏa thuận trong hợp đồng.', color: 'bg-emerald-50 text-emerald-600' },
            { Icon: Sparkles, title: 'Đối chiếu tiện nghi', description: 'Chi tiết phòng tổng hợp tiện nghi của phòng và tòa nhà. Tiện nghi không tự phát sinh khoản thu dịch vụ.', color: 'bg-teal-50 text-teal-600' },
          ].map(({ Icon, title, description, color }) => <article key={title} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className={`mb-4 flex size-12 items-center justify-center rounded-xl ${color}`}><Icon aria-hidden="true" className="size-6" /></div>
            <h3 className="mb-2 text-base font-bold text-slate-900">{title}</h3>
            <p className="text-sm leading-relaxed text-slate-600">{description}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-10">
        <header className="mb-8 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Thông tin chi phí</span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Dịch Vụ & Chi Phí Sinh Hoạt</h2>
          <p className="mt-2 text-sm text-slate-500">Đơn giá điện nước và dịch vụ chưa được công bố trên trang này. Vui lòng đối chiếu bảng giá của tòa nhà và điều khoản hợp đồng trước khi quyết định thuê.</p>
        </header>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {['Điện sinh hoạt', 'Nước sinh hoạt', 'Dịch vụ định kỳ'].map(label => <div key={label} className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-5">
            <h3 className="font-bold text-slate-900">{label}</h3>
            <span className="inline-block rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-600">Chưa công bố đơn giá</span>
            <p className="text-sm leading-relaxed text-slate-500">Cần đối chiếu bảng giá và điều khoản áp dụng trước khi ký hợp đồng.</p>
          </div>)}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Quy trình tìm hiểu phòng</span>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Chuẩn Bị Trước Khi Thuê Phòng</h2>
        <p className="mt-2 text-sm text-slate-500">Các bước tham khảo trước khi trao đổi và thỏa thuận với ban quản lý.</p>
      </header>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Chọn phòng phù hợp', description: 'Xem giá thuê, diện tích và sức chứa trong danh sách phòng đang công khai.', note: 'Tìm kiếm và bộ lọc đã sẵn sàng' },
          { title: 'Đối chiếu thông tin', description: 'Đọc mô tả, tiền cọc và tiện nghi của phòng bạn quan tâm.', note: 'Không mặc định tiền cọc một tháng' },
          { title: 'Trao đổi lịch xem', description: 'Thống nhất với ban quản lý trước khi đến xem. Chức năng đặt lịch trực tuyến chưa được mở.', note: 'Chưa tiếp nhận lịch hẹn trực tuyến' },
          { title: 'Thỏa thuận điều khoản', description: 'Kiểm tra thời hạn, các khoản thu và điều kiện bàn giao trong hợp đồng trước khi ký.', note: 'Không ký hợp đồng trên trang giới thiệu' },
        ].map((step, index) => <article key={step.title} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div><span className={`mb-4 flex size-9 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm ${index === 3 ? 'bg-emerald-600' : 'bg-sky-600'}`}>{String(index + 1).padStart(2, '0')}</span><h3 className="mb-2 text-base font-bold text-slate-900">{step.title}</h3><p className="text-sm leading-relaxed text-slate-600">{step.description}</p></div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-sky-700">{step.note}</p>
        </article>)}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Khám phá tòa nhà</span>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Các Tòa Nhà Có Phòng Công Khai</h2>
        <p className="mt-2 text-sm text-slate-500">Chọn tòa nhà để xem phòng đang cho thuê và thông tin chi tiết.</p>
      </header>
      {error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><p>{error}</p><Button variant="outline" onClick={onRetry}>Thử lại danh sách tòa nhà</Button></div> : !options ? <p role="status" className="py-8 text-center text-sm text-slate-500">Đang tải danh sách tòa nhà…</p> : options.buildings.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Chưa có tòa nhà có phòng công khai.</p> : <div className="grid gap-6 md:grid-cols-3">
        {options.buildings.slice(0, 6).map(building => <article key={building.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div aria-hidden="true" className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-sky-50 to-teal-50"><Building2 className="size-14 text-sky-400" /></div>
          <div className="flex flex-1 flex-col p-5"><h3 className="break-words text-base font-bold text-slate-900">{building.name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">Xem giá niêm yết và tiện nghi tại chi tiết từng phòng.</p><Link to={`/rooms?building_id=${building.id}`} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50">Xem các phòng<ArrowRight aria-hidden="true" className="size-4" /></Link></div>
        </article>)}
      </div>}
      {options && options.buildings.length > 6 && <Link to="/rooms" className="mt-6 inline-block text-sm font-semibold text-sky-700 underline">Xem bộ lọc tất cả tòa nhà</Link>}
    </section>

    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-sky-700 to-teal-700 p-8 text-white shadow-xl sm:p-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border-40 border-white/5" />
        <div className="relative max-w-2xl"><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tìm Thấy Căn Phòng Ưng Ý?</h2><p className="mt-2 text-sm leading-relaxed text-sky-100 sm:text-base">Đối chiếu thông tin từng phòng trước khi trao đổi với ban quản lý. Đặt lịch và ký hợp đồng trực tuyến chưa được mở tại đây.</p><div className="mt-6 flex flex-wrap gap-3"><Link to="/rooms"><Button variant="secondary" className="bg-white text-sky-800 hover:bg-sky-50" icon={<Search className="size-4" />}>Xem phòng đang cho thuê</Button></Link><Link to="/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"><FileText className="size-4" />Thông tin liên hệ & hỏi đáp</Link></div><p className="mt-5 flex items-center gap-2 text-xs text-sky-100"><CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />Giá và tiền cọc được niêm yết theo từng phòng.</p></div>
      </div>
    </section>
  </>
}
