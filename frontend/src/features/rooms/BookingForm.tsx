import React, { useState } from 'react'
import {
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { Room, AppointmentRequest } from '@/mocks/types'
import { timeSlots } from '@/mocks/data'
import { formatVND } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface BookingFormProps {
  room: Room
  onSuccess?: (appointment: AppointmentRequest) => void
  onCancel?: () => void
}

export const BookingForm: React.FC<BookingFormProps> = ({
  room,
  onSuccess,
  onCancel,
}) => {
  const { showToast } = useToast()

  // Form State
  const todayStr = new Date().toISOString().split('T')[0]
  // Default tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const [date, setDate] = useState(tomorrowStr)
  const [selectedSlot, setSelectedSlot] = useState(timeSlots[1]) // '09:30 - 10:30'
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  // Form chưa có ô nhập email (Antigravity làm dở) — giữ giá trị rỗng
  const [guestEmail] = useState('')
  const [note, setNote] = useState('')

  // Validation & Submission State
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedAppointment, setSubmittedAppointment] =
    useState<AppointmentRequest | null>(null)

  const validate = () => {
    const errs: Record<string, string> = {}

    if (!guestName.trim()) {
      errs.guestName = 'Vui lòng nhập họ và tên của bạn'
    } else if (guestName.trim().length < 2) {
      errs.guestName = 'Họ tên cần có ít nhất 2 ký tự'
    }

    const cleanPhone = guestPhone.replace(/\s+/g, '')
    if (!cleanPhone) {
      errs.guestPhone = 'Vui lòng nhập số điện thoại liên hệ'
    } else if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(cleanPhone)) {
      errs.guestPhone = 'Số điện thoại không đúng định dạng (VD: 0901234567)'
    }

    if (!date) {
      errs.date = 'Vui lòng chọn ngày xem phòng'
    } else if (date < todayStr) {
      errs.date = 'Ngày hẹn xem phòng không thể ở trong quá khứ'
    }

    if (!selectedSlot) {
      errs.timeSlot = 'Vui lòng chọn một khung giờ xem phòng'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false)
      const randomId = Math.floor(1000 + Math.random() * 9000)
      const newAppointment: AppointmentRequest = {
        code: `APT-202610-${randomId}`,
        roomId: room.id,
        roomCode: room.code,
        roomTitle: room.title,
        buildingName: room.buildingName,
        buildingAddress: room.buildingAddress,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        date,
        timeSlot: selectedSlot,
        note: note.trim() || undefined,
        createdAt: new Date().toISOString(),
        status: 'pending',
      }

      setSubmittedAppointment(newAppointment)
      showToast(
        'Đã gửi yêu cầu đặt lịch hẹn!',
        `Mã lịch hẹn: ${newAppointment.code}. Ban quản lý sẽ liên hệ xác nhận.`,
        'success'
      )
      if (onSuccess) onSuccess(newAppointment)
    }, 600)
  }

  // Success View
  if (submittedAppointment) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-emerald-100 shadow-sm text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4 shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2">
          Đã gửi yêu cầu thành công
        </span>

        <h3 className="text-xl font-bold text-slate-900 mb-1">
          Yêu Cầu Xem Phòng Đã Được Tiếp Nhận
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Hệ thống đã ghi nhận lịch hẹn xem phòng của bạn. Bộ phận quản lý tòa nhà sẽ liên hệ qua số điện thoại để chốt thời gian chính xác trước khi bạn đến.
        </p>

        {/* Appointment Summary Box */}
        <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200/80 mb-6 space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
            <span className="text-slate-500">Mã lịch hẹn:</span>
            <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
              {submittedAppointment.code}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Căn phòng:</span>
            <span className="font-semibold text-slate-800">
              {submittedAppointment.roomCode} — {submittedAppointment.buildingName}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Thời gian hẹn:</span>
            <span className="font-semibold text-emerald-700">
              {submittedAppointment.timeSlot}, ngày {new Date(submittedAppointment.date).toLocaleDateString('vi-VN')}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Người đặt lịch:</span>
            <span className="font-medium text-slate-800">
              {submittedAppointment.guestName} ({submittedAppointment.guestPhone})
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[11px]">
            <span className="text-slate-400">Trạng thái hiện tại:</span>
            <span className="font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              Chờ Ban quản trị xác nhận
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          {onCancel && (
            <Button variant="secondary" size="md" onClick={onCancel}>
              Đóng cửa sổ
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSubmittedAppointment(null)
              setGuestName('')
              setGuestPhone('')
              setNote('')
            }}
          >
            Đặt thêm lịch phòng khác
          </Button>
        </div>
      </div>
    )
  }

  // Active Booking Form
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Target Room Mini Card */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
        <img
          src={room.images[0]}
          alt={room.code}
          className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-200"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">{room.code}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              Còn trống
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {room.buildingName} • Tầng {room.floor}
          </p>
          <p className="text-xs font-bold text-sky-700 mt-0.5">
            {formatVND(room.price)} / tháng
          </p>
        </div>
      </div>

      {/* Date Picker */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-sky-600" />
          <span>Ngày bạn muốn đến xem</span>
          <span className="text-rose-500">*</span>
        </label>
        <input
          type="date"
          min={todayStr}
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            if (errors.date) setErrors((prev) => ({ ...prev, date: '' }))
          }}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition ${
            errors.date
              ? 'border-rose-300 focus:ring-2 focus:ring-rose-200'
              : 'border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200'
          }`}
        />
        {errors.date && (
          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.date}
          </p>
        )}
      </div>

      {/* Time Slot Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>Khung giờ thuận tiện</span>
          <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {timeSlots.map((slot) => {
            const isSelected = selectedSlot === slot
            return (
              <button
                type="button"
                key={slot}
                onClick={() => {
                  setSelectedSlot(slot)
                  if (errors.timeSlot)
                    setErrors((prev) => ({ ...prev, timeSlot: '' }))
                }}
                className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50 text-sky-700 font-semibold shadow-xs ring-1 ring-sky-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {slot}
              </button>
            )
          })}
        </div>
        {errors.timeSlot && (
          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.timeSlot}
          </p>
        )}
      </div>

      {/* Contact Info (Name & Phone) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-600" />
            <span>Họ và tên của bạn</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="VD: Nguyễn Văn An"
            value={guestName}
            onChange={(e) => {
              setGuestName(e.target.value)
              if (errors.guestName)
                setErrors((prev) => ({ ...prev, guestName: '' }))
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition ${
              errors.guestName
                ? 'border-rose-300 focus:ring-2 focus:ring-rose-200'
                : 'border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200'
            }`}
          />
          {errors.guestName && (
            <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.guestName}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-sky-600" />
            <span>Số điện thoại</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="VD: 0912 345 678"
            value={guestPhone}
            onChange={(e) => {
              setGuestPhone(e.target.value)
              if (errors.guestPhone)
                setErrors((prev) => ({ ...prev, guestPhone: '' }))
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition ${
              errors.guestPhone
                ? 'border-rose-300 focus:ring-2 focus:ring-rose-200'
                : 'border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200'
            }`}
          />
          {errors.guestPhone && (
            <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.guestPhone}
            </p>
          )}
        </div>
      </div>

      {/* Note (Optional) */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-sky-600" />
          <span>Ghi chú bổ sung (tùy chọn)</span>
        </label>
        <textarea
          rows={2}
          placeholder="VD: Tôi muốn dọn vào đầu tháng tới, có 1 xe máy..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition resize-none"
        />
      </div>

      {/* Trust Notice */}
      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 leading-relaxed border border-slate-200/60">
        <span className="font-semibold text-slate-700">Cam kết dịch vụ:</span> Xem phòng hoàn toàn miễn phí, nhân viên quản lý sẽ đón tiếp trực tiếp tại tòa nhà. Không phát sinh bất kỳ khoản phí môi giới nào.
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            className="w-1/3"
          >
            Hủy bỏ
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="flex-1"
          isLoading={isSubmitting}
        >
          Xác nhận đặt lịch xem phòng
        </Button>
      </div>
    </form>
  )
}
