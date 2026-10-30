export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export interface ViewingAppointment {
  id: number
  code: string
  guest_name: string
  guest_phone: string
  preferred_at: string
  status: AppointmentStatus
  room: { id: number; code: string; building_name: string }
  checked_in_at: string | null
  checked_out_at: string | null
  can_cancel: boolean
  admin_note?: string | null
  guard_note?: string | null
}
export interface AppointmentPage {
  data: ViewingAppointment[]
  meta: { current_page: number; last_page: number; total: number }
}
export const appointmentLabels: Record<AppointmentStatus, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', completed: 'Hoàn tất', cancelled: 'Đã hủy',
}
