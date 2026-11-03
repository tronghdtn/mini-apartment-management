import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { MaintenanceContext, MaintenancePage, MaintenanceRequest, MaintenanceStatus, TechnicianOption } from './types'
import type { MaintenanceAssignmentInput, MaintenanceCreateInput, MaintenanceNoteInput } from './schemas'

export interface MaintenanceFilters {
  status?: MaintenanceStatus | ''
  room_id?: number
  /** Chỉ Admin: lọc theo người gửi / người được giao. */
  user_id?: number
  assigned_to?: number
  page?: number
}

export async function getMaintenanceContext(signal?: AbortSignal): Promise<MaintenanceContext> {
  return (await http.get<ApiResource<MaintenanceContext>>('/maintenance-requests/context', { signal })).data.data
}

export async function getMaintenanceRequests(filters: MaintenanceFilters, signal?: AbortSignal): Promise<MaintenancePage> {
  return (await http.get<MaintenancePage>('/maintenance-requests', {
    params: { ...filters, status: filters.status || undefined }, signal,
  })).data
}

export async function getMaintenanceRequest(id: number, signal?: AbortSignal): Promise<MaintenanceRequest> {
  return (await http.get<ApiResource<MaintenanceRequest>>(`/maintenance-requests/${id}`, { signal })).data.data
}

export async function getActiveTechnicians(signal?: AbortSignal): Promise<TechnicianOption[]> {
  const technicians: TechnicianOption[] = []
  let page = 1
  while (true) {
    const response = await http.get<{ data: TechnicianOption[]; meta: { last_page: number } }>('/users', {
      params: { role: 'technician', status: 'active', page }, signal,
    })
    technicians.push(...response.data.data)
    if (page >= response.data.meta.last_page) return technicians
    page += 1
  }
}

export async function createMaintenanceRequest(input: MaintenanceCreateInput): Promise<MaintenanceRequest> {
  await fetchCsrfCookie()
  const body = new FormData()
  body.append('title', input.title.trim())
  body.append('description', input.description.trim())
  body.append('priority', input.priority)
  if (input.photos) Array.from(input.photos).forEach(photo => body.append('photos[]', photo))
  return (await http.post<ApiResource<MaintenanceRequest>>('/maintenance-requests', body)).data.data
}

export async function updateMaintenanceRequest(id: number, input: { priority: string; admin_note: string }): Promise<MaintenanceRequest> {
  await fetchCsrfCookie()
  return (await http.patch<ApiResource<MaintenanceRequest>>(`/maintenance-requests/${id}`, input)).data.data
}

export async function assignMaintenanceRequest(id: number, input: MaintenanceAssignmentInput): Promise<MaintenanceRequest> {
  await fetchCsrfCookie()
  return (await http.post<ApiResource<MaintenanceRequest>>(`/maintenance-requests/${id}/assign`, input)).data.data
}

export async function startMaintenanceRequest(id: number): Promise<MaintenanceRequest> {
  await fetchCsrfCookie()
  return (await http.post<ApiResource<MaintenanceRequest>>(`/maintenance-requests/${id}/start`)).data.data
}

export async function resolveMaintenanceRequest(id: number, input: MaintenanceNoteInput): Promise<MaintenanceRequest> {
  await fetchCsrfCookie()
  return (await http.post<ApiResource<MaintenanceRequest>>(`/maintenance-requests/${id}/resolve`, { handler_note: input.note })).data.data
}

export async function rejectMaintenanceRequest(id: number, input: MaintenanceNoteInput): Promise<MaintenanceRequest> {
  await fetchCsrfCookie()
  return (await http.post<ApiResource<MaintenanceRequest>>(`/maintenance-requests/${id}/reject`, { admin_note: input.note })).data.data
}

export async function reopenMaintenanceRequest(id: number): Promise<MaintenanceRequest> {
  await fetchCsrfCookie()
  return (await http.post<ApiResource<MaintenanceRequest>>(`/maintenance-requests/${id}/reopen`)).data.data
}
