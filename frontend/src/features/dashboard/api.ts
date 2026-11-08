import { http } from '@/lib/http'
import { dashboardSummarySchema, dashboardPageSchema, dashboardBuildingsSchema, dashboardCountPageSchema, dashboardAppointmentsSchema } from './schemas'
import type { DashboardQueue } from './activity'
import type { DashboardSummary } from './types'

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await http.get<{ data: DashboardSummary }>('/dashboard', { signal })
  return dashboardSummarySchema.parse(response.data.data)
}

export async function getDashboardBuildings(page: string, signal?: AbortSignal) {
  return dashboardBuildingsSchema.parse((await http.get('/dashboard/buildings', { params: { page: dashboardPageSchema.parse(page) }, signal })).data)
}
export async function getDashboardQueue(queue: DashboardQueue, signal?: AbortSignal) {
  return dashboardCountPageSchema.parse((await http.get(queue.path, { params: { ...queue.params, page: 1 }, signal })).data).meta.total
}
export async function getDashboardAppointments(date: string, signal?: AbortSignal) {
  return dashboardAppointmentsSchema.parse((await http.get('/viewing-appointments', { params: { date, page: 1 }, signal })).data)
}
/** Tổng số phòng (mọi trạng thái) lấy từ meta phân trang của danh sách phòng, để tính tỷ lệ lấp đầy. */
export async function getTotalRooms(signal?: AbortSignal) {
  return dashboardCountPageSchema.parse((await http.get('/rooms', { params: { page: 1 }, signal })).data).meta.total
}
