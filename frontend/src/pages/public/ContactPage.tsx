import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Building2, Clock, HelpCircle, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getPublicRoomOptions } from '@/features/rooms/api'
import type { PublicRoomOptions } from '@/features/rooms/types'
import { apiErrorMessage } from '@/lib/apiErrors'

const questions = [
  { q: 'Tiền cọc khi thuê phòng là bao nhiêu?', a: 'Tiền cọc niêm yết hiển thị tại chi tiết từng phòng. Số tiền áp dụng được ghi trong hợp đồng đã thỏa thuận, không mặc định bằng một tháng tiền thuê.' },
  { q: 'Thời hạn hợp đồng và phí trả trước hạn được xác định thế nào?', a: 'Thời hạn và điều khoản chấm dứt phải được hai bên thỏa thuận trong hợp đồng. Không tự phát sinh phí trả trước hạn khi hợp đồng không có điều khoản tương ứng.' },
  { q: 'Tiện nghi có tự phát sinh khoản thu không?', a: 'Tiện nghi dùng để mô tả tòa nhà và phòng. Các khoản thu dịch vụ được thỏa thuận riêng trong hợp đồng.' },
  { q: 'Tôi có thể đặt lịch xem phòng trực tuyến chưa?', a: 'Chức năng đặt lịch trực tuyến chưa được mở. Bạn có thể xem danh sách phòng công khai và thông tin từng phòng trước khi liên hệ ban quản lý.' },
]

export function ContactPage() {
  const [buildings, setBuildings] = useState<PublicRoomOptions['buildings'] | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getPublicRoomOptions(controller.signal)
      .then(data => { if (!controller.signal.aborted) setBuildings(data.buildings) })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
    return () => controller.abort()
  }, [revision])
  return <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
    <header className="mx-auto max-w-2xl space-y-2 text-center"><span className="text-xs font-bold uppercase tracking-wider text-sky-600">Thông tin liên hệ</span><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Hệ Thống Tòa Nhà & Hỗ Trợ Khách Hàng</h1><p className="text-sm leading-relaxed text-slate-500">Tìm phòng phù hợp và tìm hiểu các thông tin trước khi thuê.</p></header>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{[{ Icon: Phone, title: 'Điện thoại hỗ trợ', color: 'bg-sky-50 text-sky-600', value: 'Chưa công bố số liên hệ' }, { Icon: Mail, title: 'Hòm thư điện tử', color: 'bg-teal-50 text-teal-600', value: 'Chưa công bố email hỗ trợ' }, { Icon: Clock, title: 'Thời gian tiếp đón', color: 'bg-emerald-50 text-emerald-600', value: 'Chưa công bố khung giờ' }].map(({ Icon, title, color, value }) => <section key={title} className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"><div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${color}`}><Icon className="size-6" /></div><div><h2 className="text-sm font-bold text-slate-900">{title}</h2><p className="mt-2 text-sm text-slate-500">{value}</p></div></section>)}</div>
    <section className="space-y-6"><div><h2 className="text-xl font-bold text-slate-900">Danh Sách Cơ Sở Có Phòng Công Khai</h2><p className="mt-1 text-xs text-slate-500">Chọn tòa nhà để xem các phòng hiện có. Địa chỉ được hiển thị tại chi tiết phòng.</p></div>
      {error ? <div role="alert" className="space-y-3 rounded-2xl bg-rose-50 p-5 text-sm text-rose-800"><p>{error}</p><Button variant="outline" onClick={() => { setError(''); setBuildings(null); setRevision(value => value + 1) }}>Thử lại</Button></div> : buildings === null ? <p role="status" className="text-sm text-slate-500">Đang tải danh sách tòa nhà…</p> : buildings.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Chưa có tòa nhà có phòng công khai.</p> : <div className="grid gap-6 md:grid-cols-3">{buildings.map(building => <article key={building.id} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs"><div aria-hidden="true" className="flex h-36 items-center justify-center bg-gradient-to-br from-sky-50 to-teal-50"><Building2 className="size-12 text-sky-400" /></div><div className="flex flex-1 flex-col gap-4 p-6"><h3 className="break-words text-base font-bold text-slate-900">{building.name}</h3><Link to={`/rooms?building_id=${building.id}`} className="mt-auto"><Button className="w-full" size="sm">Xem phòng tại tòa nhà</Button></Link></div></article>)}</div>}
    </section>
    <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-6 sm:p-10"><header><span className="text-xs font-bold uppercase tracking-wider text-sky-600">Hỏi đáp phổ biến</span><h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Những Câu Hỏi Khách Thuê Thường Quan Tâm</h2></header><div className="divide-y divide-slate-200">{questions.map(question => <div key={question.q} className="py-4"><h3 className="flex items-start gap-2 text-sm font-bold text-slate-900"><HelpCircle className="mt-0.5 size-4 shrink-0 text-sky-600" />{question.q}</h3><p className="mt-2 pl-6 text-xs leading-relaxed text-slate-600">{question.a}</p></div>)}</div></section>
  </div>
}
