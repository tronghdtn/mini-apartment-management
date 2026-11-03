import { fetchCsrfCookie, http } from '@/lib/http'
import type { AppointmentBookingInput } from './schemas'
import { appointmentBookingSchema, appointmentFiltersSchema, appointmentRoomSchema, vietnamAppointmentTime } from './schemas'
import type { AppointmentPage, ViewingAppointment } from './types'

export async function getAppointments(input: { status: string; page: string; date: string }, signal?: AbortSignal, roomId?: number) {
  const filters = appointmentFiltersSchema.parse(input)
  return (await http.get<AppointmentPage>('/viewing-appointments', { params: {
    ...filters, status: filters.status === 'all' ? undefined : filters.status, date: filters.date || undefined,
    room_id: roomId === undefined ? undefined : appointmentRoomSchema.parse(roomId),
  }, signal })).data
}
export async function bookAppointment(roomId: string, input: AppointmentBookingInput) {
  const data = appointmentBookingSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.post<{ data: ViewingAppointment }>('/viewing-appointments', {
    ...data, room_id: roomId, preferred_at: vietnamAppointmentTime(data.preferred_at),
  })).data.data
}
export async function changeAppointment(id: number, action: string, data: Record<string, string>) {
  await fetchCsrfCookie()
  return (await http.post<{ data: ViewingAppointment }>(`/viewing-appointments/${id}/${action}`, data)).data.data
}
