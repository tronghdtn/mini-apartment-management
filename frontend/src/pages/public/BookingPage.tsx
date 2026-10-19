import React, { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router'
import {
  Calendar,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import { rooms } from '@/mocks/data'
import { BookingForm } from '@/features/rooms/BookingForm'
import { Button } from '@/components/ui/Button'

export const BookingPage: React.FC = () => {
  const { roomId } = useParams<{ roomId?: string }>()
  const [searchParams] = useSearchParams()

  const queryRoomId = searchParams.get('roomId') || roomId
  const availableRooms = rooms.filter((r) => r.status === 'available' && r.is_public)

  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    queryRoomId || (availableRooms[0] ? availableRooms[0].id.toString() : '')
  )

  const currentRoom = availableRooms.find((r) => r.id.toString() === selectedRoomId)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-900 transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/rooms" className="hover:text-slate-900 transition-colors">
          Danh sách phòng
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">Đặt lịch xem phòng</span>
      </nav>

      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold uppercase tracking-wider mb-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>Đặt lịch xem phòng trực tiếp</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Hẹn Lịch Khảo Sát Thực Tế
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
          Hãy chọn ngày giờ bạn có thể ghé qua tòa nhà. Nhân viên quản lý sẽ đón tiếp, hướng dẫn bạn tham quan phòng và các tiện ích chung hoàn toàn miễn phí.
        </p>
      </div>

      {/* Room Selector if user came to /book without a preselected room */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Chọn căn phòng bạn muốn xem
        </label>
        <select
          value={selectedRoomId}
          onChange={(e) => setSelectedRoomId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none cursor-pointer"
        >
          {availableRooms.map((r) => (
            <option key={r.id} value={r.id.toString()}>
              {r.code} — {r.title} ({r.buildingName} • {r.area}m²)
            </option>
          ))}
        </select>
      </div>

      {/* Booking Form Box */}
      {currentRoom ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8">
          <BookingForm room={currentRoom} />
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-sm text-slate-500">Hiện không có phòng trống nào phù hợp.</p>
          <Link to="/rooms" className="mt-3 inline-block">
            <Button variant="primary" size="sm">
              Quay lại danh sách phòng
            </Button>
          </Link>
        </div>
      )}

      {/* Helpful Trust Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs text-slate-600">
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 block">Miễn phí 100%</strong>
            <span>Không thu bất kỳ khoản phí xem phòng hay phí dẫn khách nào.</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 block">Đón tiếp đúng hẹn</strong>
            <span>Ban quản lý xác nhận qua điện thoại trước 30 phút để chuẩn bị.</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 block">Tư vấn tận tâm</strong>
            <span>Hỗ trợ giải đáp chi tiết hợp đồng, tiền cọc và thủ tục tạm trú.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
