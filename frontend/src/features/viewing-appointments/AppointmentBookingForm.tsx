import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Calendar, CheckCircle2, Clock, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import type { PublicRoom } from '@/features/rooms/types'
import { applyApiErrors } from '@/lib/apiErrors'
import { formatDateTime, formatVND } from '@/lib/format'
import { bookAppointment } from './api'
import { appointmentBookingSchema } from './schemas'
import type { AppointmentBookingInput } from './schemas'
import type { ViewingAppointment } from './types'

interface AppointmentBookingFormProps {
  roomId: string
  room?: PublicRoom
  compact?: boolean
  onSuccess?: (appointment: ViewingAppointment) => void
}

const timeSlots = [
  { label: '08:30 - 09:30', time: '08:30' },
  { label: '10:00 - 11:00', time: '10:00' },
  { label: '14:00 - 15:00', time: '14:00' },
  { label: '15:30 - 16:30', time: '15:30' },
  { label: '17:00 - 18:00', time: '17:00' },
  { label: '18:30 - 19:30', time: '18:30' },
]

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function getTomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export function AppointmentBookingForm({ roomId, room, compact = false, onSuccess }: AppointmentBookingFormProps) {
  const { user } = useAuth()
  const [saved, setSaved] = useState<ViewingAppointment>()
  const flight = useRef(false)

  const [date, setDate] = useState(getTomorrowStr)
  const [selectedSlot, setSelectedSlot] = useState(timeSlots[1]) // '10:00 - 11:00'

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentBookingInput>({
    resolver: zodResolver(appointmentBookingSchema),
    defaultValues: {
      guest_name: user?.full_name ?? '',
      guest_phone: user?.phone ?? '',
      preferred_at: `${getTomorrowStr()}T10:00`,
      website: '',
    },
  })

  useEffect(() => {
    if (date && selectedSlot) {
      setValue('preferred_at', `${date}T${selectedSlot.time}`, { shouldValidate: true })
    }
  }, [date, selectedSlot, setValue])

  async function submit(input: AppointmentBookingInput) {
    if (flight.current) return
    flight.current = true
    try {
      const res = await bookAppointment(roomId, input)
      setSaved(res)
      if (onSuccess) onSuccess(res)
    } catch (failure) {
      applyApiErrors(failure, setError, ['guest_name', 'guest_phone', 'preferred_at', 'website'])
    } finally {
      flight.current = false
    }
  }

  if (saved) {
    return (
      <div role="status" className="p-6 bg-white rounded-2xl border border-emerald-100 shadow-sm text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4 shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2">
          Đã tiếp nhận yêu cầu
        </span>

        <h3 className="text-xl font-bold text-slate-900 mb-1">
          Yêu Cầu Xem Phòng Đã Được Ghi Nhận
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Hệ thống đã chuyển thông tin tới ban quản lý tòa nhà. Nhân viên sẽ liên hệ qua số điện thoại để xác nhận trước khi bạn đến.
        </p>

        {/* Appointment Summary Box */}
        <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200/80 mb-6 space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
            <span className="text-slate-500">Mã lịch hẹn:</span>
            <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
              {saved.code}
            </span>
          </div>

          {room && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Căn phòng:</span>
              <span className="font-semibold text-slate-800">
                Phòng {room.code} — {room.building.name}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Thời gian hẹn:</span>
            <span className="font-semibold text-emerald-700">
              {formatDateTime(saved.preferred_at)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-xs">
            <span className="text-slate-500">Trạng thái:</span>
            <span className="font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
              Chờ Quản trị viên xác nhận
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {saved.can_cancel ? (
            <Link to="/account/appointments" className="block text-sm font-semibold text-sky-700 hover:underline">
              Xem danh sách lịch hẹn của tôi →
            </Link>
          ) : (
            <p className="text-xs text-slate-500">
              Khách chưa có tài khoản vui lòng liên hệ hotline để đổi lịch hoặc hỗ trợ thêm.
            </p>
          )}
          <button
            type="button"
            onClick={() => setSaved(undefined)}
            className="text-xs text-slate-500 hover:text-slate-800 underline py-1"
          >
            Đặt lịch phòng khác
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => { void handleSubmit(submit)(event) }} className="space-y-3.5">
      {/* Target Mini Room Card (shown in Modal, hidden when compact on RoomDetailPage) */}
      {room && !compact && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
          {room.photos.length > 0 ? (
            <img
              src={room.photos[0].url}
              alt={room.code}
              className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Phòng {room.code}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                Còn trống
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {room.building.name} • Tầng {room.floor_number}
            </p>
            <p className="text-xs font-bold text-sky-700 mt-0.5">
              {formatVND(room.base_price)} / tháng
            </p>
          </div>
        </div>
      )}

      <fieldset disabled={isSubmitting} className="space-y-4">
        {/* Name and Phone side-by-side on sm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 whitespace-nowrap">
              <User className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Họ và tên</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('guest_name')}
              type="text"
              placeholder="Ví dụ: Nguyễn Văn An"
              aria-invalid={!!errors.guest_name}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
            />
            {errors.guest_name && (
              <span role="alert" className="text-xs text-rose-600 mt-1 block">
                {errors.guest_name.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 whitespace-nowrap">
              <Phone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Số điện thoại</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('guest_phone')}
              type="tel"
              placeholder="Ví dụ: 0901234567"
              aria-invalid={!!errors.guest_phone}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
            />
            {errors.guest_phone && (
              <span role="alert" className="text-xs text-rose-600 mt-1 block">
                {errors.guest_phone.message}
              </span>
            )}
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Ngày bạn muốn đến xem</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            min={getTodayStr()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
          />
        </div>

        {/* Time Slot Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Khung giờ thuận tiện</span>
            <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => {
              const isSelected = selectedSlot.time === slot.time
              return (
                <button
                  type="button"
                  key={slot.time}
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-medium border text-center whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50 text-sky-700 font-semibold shadow-xs ring-1 ring-sky-500'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {slot.label}
                </button>
              )
            })}
          </div>
          {errors.preferred_at && (
            <span role="alert" className="text-xs text-rose-600 mt-1 block">
              {errors.preferred_at.message}
            </span>
          )}
          <p className="text-[11px] text-slate-500 mt-1.5">
            Giờ làm việc đón tiếp: 08:00 đến 20:00 (giờ Việt Nam).
          </p>
        </div>

        {/* Honeypot field */}
        <div aria-hidden="true" className="hidden">
          <label>
            Website
            <input {...register('website')} tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {errors.root && (
          <p role="alert" className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            {errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSubmitting}
          className="w-full h-11 font-semibold text-sm shadow-md shadow-sky-600/20"
        >
          {isSubmitting ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu đặt lịch hẹn'}
        </Button>

        <p className="text-[11px] text-slate-400 text-center">
          Hoàn toàn miễn phí · Quản trị viên sẽ xác nhận trước khi bạn đến
        </p>
      </fieldset>
    </form>
  )
}
