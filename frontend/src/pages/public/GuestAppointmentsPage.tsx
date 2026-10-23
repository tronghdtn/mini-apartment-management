import { Link } from 'react-router'

export function GuestAppointmentsPage() {
  return <div className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="text-2xl font-bold text-slate-900 mb-4">Lịch hẹn của tôi</h1>
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
      <p className="text-sm text-slate-600">Chức năng quản lý lịch hẹn chưa được triển khai. Trang này chưa hiển thị lịch hẹn cá nhân.</p>
      <Link to="/account/profile" className="inline-block mt-5 text-sm font-semibold text-sky-700">Tài khoản của tôi</Link>
    </div>
  </div>
}
