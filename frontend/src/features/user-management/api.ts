import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { ManagedUserStatus, UserDetail, UserPage, UserSummary } from './types'
import type { StaffUserInput, UserFilters, UserNameInput } from './schemas'
import { userNameSchema, userStatusSchema } from './schemas'
import { userContractsQuerySchema, userContractsPageSchema } from './contractHistory'

export async function getUsers(page: number, filters: UserFilters, signal?: AbortSignal): Promise<UserPage> {
  const params = { page, role: filters.role || undefined, status: filters.status || undefined,
    has_active_contract: filters.has_active_contract || undefined, q: filters.q || undefined }
  return (await http.get<UserPage>('/users', { params, signal })).data
}

export async function getUser(id: string, signal?: AbortSignal): Promise<UserDetail> {
  return (await http.get<ApiResource<UserDetail>>(`/users/${encodeURIComponent(id)}`, { signal })).data.data
}

export async function getUserContracts(userId: number, page: string, signal?: AbortSignal) {
  const params = userContractsQuerySchema.parse({ user_id: userId, page })
  return userContractsPageSchema.parse((await http.get('/contracts', { params, signal })).data)
}

export async function createStaffUser(input: StaffUserInput): Promise<UserSummary> {
  await fetchCsrfCookie()
  const response = await http.post<ApiResource<UserSummary>>('/users', {
    full_name: input.full_name, phone: input.phone, email: input.email || null, role: input.role,
    password: input.password, password_confirmation: input.password_confirmation,
  })
  return response.data.data
}

export async function changeUserStatus(id: number, status: ManagedUserStatus): Promise<UserSummary> {
  const body = userStatusSchema.parse({ status })
  await fetchCsrfCookie()
  return (await http.patch<ApiResource<UserSummary>>(`/users/${id}/status`, body)).data.data
}

export async function updateUserName(id: number, input: UserNameInput): Promise<UserSummary> {
  const body = userNameSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.patch<ApiResource<UserSummary>>(`/users/${id}`, body)).data.data
}
