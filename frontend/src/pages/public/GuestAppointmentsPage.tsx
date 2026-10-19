import React from 'react'
import { Link } from 'react-router'
import { Calendar, Clock } from 'lucide-react'
import { useApp } from '@/mocks/AppContext'
import { formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export const GuestAppointmentsPage: React.FC = () => {
  const { appointments, currentUser } = useApp()

  // Filter appointments for current guest or sample guest
  const guestAppointments = appointments.filter(
    (a) => a.guestPhone === currentUser.phone || a.guestPhone === '0901000007'
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch Hẹn Của Tôi</h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi trạng thái các lịch hẹn xem phòng bạn đã đăng ký với ban quản lý.
          </p>
        </div>
        <Link to="/rooms">
          <Button variant="primary" size="sm">
            Đặt thêm lịch hẹn
          </Button>
        </Link>
      </div>

      {guestAppointments.length > 0 ? (
        <div className="space-y-4">
          {guestAppointments.map((apt) => (
            <div
              key={apt.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                    {apt.code}
                  </span>
                  {apt.status === 'confirmed' && (
                    <Badge tone="emerald" dot>Đã xác nhận</Badge>
                  )}
                  {apt.status === 'pending' && (
                    <Badge tone="amber" dot>Chờ ban quản lý gọi</Badge>
                  )}
                  {apt.status === 'completed' && (
                    <Badge tone="slate">Đã hoàn tất</Badge>
                  )}
                  {apt.status === 'cancelled' && (
                    <Badge tone="rose">Đã hủy</Badge>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900">
                  Phòng {apt.roomCode} — {apt.buildingName}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    Ngày {formatDate(apt.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    Khung giờ: {apt.timeSlot}
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Địa chỉ tòa: {apt.buildingAddress}
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="text-xs text-slate-500 block">
                  Người đăng ký: <strong className="text-slate-800">{apt.guestName}</strong>
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  SĐT: {apt.guestPhone}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">Chưa có lịch hẹn nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Bạn chưa đăng ký lịch xem phòng nào. Hãy duyệt danh sách phòng trống và chọn thời gian bạn rảnh nhé!
          </p>
          <Link to="/rooms">
            <Button variant="primary" size="sm" className="mt-2">
              Khám phá phòng ngay
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
