import { Link } from 'react-router'
import { Calendar } from 'lucide-react'

export function BookingPage() {
  return <div className="max-w-2xl mx-auto px-4 py-16 space-y-5 text-center">
    <Calendar aria-hidden="true" className="w-12 h-12 mx-auto text-sky-600" />
    <h1 className="text-2xl font-extrabold text-slate-900">Đặt lịch xem phòng</h1>
    <p role="status" className="text-slate-600 leading-relaxed">Đặt lịch trực tuyến chưa được mở. Hệ thống chưa tiếp nhận lịch hẹn tại đây.</p>
    <Link to="/rooms" className="inline-block rounded-xl bg-sky-600 hover:bg-sky-700 px-5 py-3 text-white font-semibold text-sm">Xem phòng đang cho thuê</Link>
  </div>
}
