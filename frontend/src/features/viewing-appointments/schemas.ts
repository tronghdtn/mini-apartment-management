import { z } from 'zod'
import { validPhone } from '../../lib/accountSchemas.ts'

// datetime-local is explicitly interpreted in Vietnam, independent of the browser's timezone.
export const appointmentTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Nhập ngày và giờ hẹn.').refine(value => {
  const iso = `${value}:00+07:00`
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return false
  const normalized = new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16)
  return normalized === value && value.slice(11) >= '08:00' && value.slice(11) <= '20:00'
}, 'Chọn thời gian hợp lệ trong 08:00–20:00 giờ Việt Nam.')

export const appointmentBookingSchema = z.object({
  guest_name: z.string().trim().min(1, 'Nhập tên người xem phòng.').max(120, 'Tên tối đa 120 ký tự.'),
  guest_phone: z.string().trim().refine(validPhone, 'Số điện thoại gồm 10–15 chữ số, có thể bắt đầu bằng +.'),
  preferred_at: appointmentTimeSchema,
  website: z.string().max(0, 'Biểu mẫu không hợp lệ.'),
})
export type AppointmentBookingInput = z.infer<typeof appointmentBookingSchema>
export const appointmentActionSchema = z.object({
  preferred_at: z.string(), note: z.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự.'),
})
export type AppointmentActionInput = z.infer<typeof appointmentActionSchema>
export const appointmentFiltersSchema = z.object({
  status: z.enum(['all', 'pending', 'confirmed', 'completed', 'cancelled']),
  page: z.string().regex(/^[1-9]\d*$/).refine(value => Number(value) <= 2147483647),
  date: z.union([z.literal(''), z.iso.date()]),
})
export const appointmentRoomSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
export function vietnamAppointmentTime(value: string) {
  return `${appointmentTimeSchema.parse(value)}:00+07:00`
}
