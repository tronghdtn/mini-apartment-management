import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import { contractFiltersSchema, draftContractSchema } from './schemas'
import type { ContractFilters, DraftContractInput } from './schemas'
import type { Contract, ContractPage, ContractOptions, ContractRoomOption, ContractTenantOption } from './types'

export async function getContracts(page: number, filters: ContractFilters, signal?: AbortSignal): Promise<ContractPage> {
  const input = contractFiltersSchema.parse(filters)
  const params = { page, status: input.status || undefined, building_id: input.building_id || undefined,
    room_id: input.room_id || undefined, user_id: input.user_id || undefined, q: input.q || undefined }
  return (await http.get<ContractPage>('/contracts', { params, signal })).data
}

export async function getContract(id: string, signal?: AbortSignal): Promise<Contract> {
  return (await http.get<ApiResource<Contract>>(`/contracts/${encodeURIComponent(id)}`, { signal })).data.data
}

/** Duyệt đủ các trang; không bỏ mất lựa chọn nằm ngoài 20 dòng đầu. */
async function getAllOptions<T>(url: string, params: Record<string, string>, signal?: AbortSignal): Promise<T[]> {
  const result: T[] = []
  let page = 1
  while (true) {
    const response = await http.get<{ data: T[]; meta: { last_page: number } }>(url, { params: { ...params, page }, signal })
    result.push(...response.data.data)
    if (page >= response.data.meta.last_page) return result
    page += 1
  }
}

export async function getContractOptions(signal?: AbortSignal): Promise<ContractOptions> {
  const [rooms, tenants] = await Promise.all([
    getAllOptions<ContractRoomOption>('/rooms', { status: 'available' }, signal),
    getAllOptions<ContractTenantOption>('/users', { status: 'active', has_active_contract: '0' }, signal),
  ])
  return { rooms: rooms.filter(room => room.status === 'available'),
    tenants: tenants.filter(user => ['user', 'resident'].includes(user.role) && user.status === 'active' && !user.has_active_contract) }
}

export async function saveDraftContract(input: DraftContractInput, id?: number): Promise<Contract> {
  const valid = draftContractSchema.parse(input)
  const body = { ...valid, note: valid.note || null }
  await fetchCsrfCookie()
  const response = id === undefined
    ? await http.post<ApiResource<Contract>>('/contracts', body)
    : await http.patch<ApiResource<Contract>>(`/contracts/${id}`, body)
  return response.data.data
}

export async function deleteDraftContract(id: number): Promise<void> {
  await fetchCsrfCookie()
  await http.delete(`/contracts/${id}`)
}
