import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { applyApiErrors } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { bookAppointment } from './api'
import { appointmentBookingSchema } from './schemas'
import type { AppointmentBookingInput } from './schemas'
import type { ViewingAppointment } from './types'

export function AppointmentBookingForm({ roomId }: { roomId: string }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState<ViewingAppointment>()
  const flight = useRef(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<AppointmentBookingInput>({
    resolver: zodResolver(appointmentBookingSchema), defaultValues: { guest_name: user?.full_name ?? '', guest_phone: user?.phone ?? '', preferred_at: '', website: '' },
  })
  async function submit(input: AppointmentBookingInput) {
    if (flight.current) return
    flight.current = true
    try { setSaved(await bookAppointment(roomId, input)) }
    catch (failure) { applyApiErrors(failure, setError, ['guest_name', 'guest_phone', 'preferred_at', 'website']) }
    finally { flight.current = false }
  }
  if (saved) return <div role="status" className="space-y-4 rounded-2xl bg-teal-50 p-6 text-teal-900">
    <h2 className="text-xl font-bold">Đã tiếp nhận lịch {saved.code}</h2>
    <p>Thời gian đề nghị: {formatDateTime(saved.preferred_at)}. Lịch đang chờ quản trị viên xác nhận.</p>
    {saved.can_cancel ? <Link to="/account/appointments" className="font-bold underline">Xem lịch hẹn của tôi</Link> : <p>Khách chưa có tài khoản vui lòng liên hệ quản trị viên để hủy hoặc đổi giờ. Hệ thống không mở tra cứu công khai bằng số điện thoại.</p>}
  </div>
  return <form onSubmit={event => { void handleSubmit(submit)(event) }} className="space-y-5">
    <fieldset disabled={isSubmitting} className="space-y-5">
      {([['guest_name', 'Họ và tên', 'text'], ['guest_phone', 'Số điện thoại', 'tel'], ['preferred_at', 'Ngày giờ hẹn (giờ Việt Nam)', 'datetime-local']] as const).map(([name, label, type]) => <label key={name} className="block space-y-2 text-sm font-semibold text-slate-700">{label}<input {...register(name)} type={type} aria-invalid={!!errors[name]} className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal focus:border-sky-500" />{errors[name] && <span role="alert" className="text-rose-700">{errors[name].message}</span>}</label>)}
      <div aria-hidden="true" className="hidden"><label>Website<input {...register('website')} tabIndex={-1} autoComplete="off" /></label></div>
      <p className="text-sm text-slate-500">Nhận lịch tương lai từ 08:00 đến 20:00. Gửi biểu mẫu chưa đồng nghĩa lịch đã được xác nhận.</p>
      {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu đặt lịch'}</Button>
    </fieldset>
  </form>
}
