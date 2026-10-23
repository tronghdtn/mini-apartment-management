import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { BuildingOption, Room, RoomFilters, RoomPage } from './types'
import type { RoomInput } from './schemas'

export async function getRooms(page: number, filters: RoomFilters, signal?: AbortSignal): Promise<RoomPage> {
  const params = { page, building_id: filters.building_id || undefined,
    status: filters.status || undefined, q: filters.q.trim() || undefined }
  return (await http.get<RoomPage>('/rooms', { params, signal })).data
}

export async function getRoom(id: string, signal?: AbortSignal): Promise<Room> {
  return (await http.get<ApiResource<Room>>(`/rooms/${encodeURIComponent(id)}`, { signal })).data.data
}

export async function getBuildingOptions(signal?: AbortSignal): Promise<BuildingOption[]> {
  const options: BuildingOption[] = []
  let page = 1
  while (true) {
    const response = await http.get<{ data: BuildingOption[]; meta: { last_page: number } }>('/buildings', { params: { page }, signal })
    options.push(...response.data.data.map(building => ({ id: building.id, name: building.name, total_floors: building.total_floors })))
    if (page >= response.data.meta.last_page) return options
    page += 1
  }
}

export async function saveRoom(input: RoomInput, id?: number): Promise<Room> {
  await fetchCsrfCookie()
  const data = { building_id: input.building_id, code: input.code, floor_number: input.floor_number,
    area: input.area, base_price: input.base_price, deposit_amount: input.deposit_amount,
    max_occupants: input.max_occupants, is_public: input.is_public, description: input.description || null }
  const response = id === undefined
    ? await http.post<ApiResource<Room>>('/rooms', data)
    : await http.patch<ApiResource<Room>>(`/rooms/${id}`, data)
  return response.data.data
}
