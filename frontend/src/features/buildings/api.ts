import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { Building, BuildingPage } from './types'
import type { BuildingInput } from './schemas'

export async function getBuildings(page = 1, signal?: AbortSignal): Promise<BuildingPage> {
  return (await http.get<BuildingPage>('/buildings', { params: { page }, signal })).data
}

export async function getBuilding(id: string, signal?: AbortSignal): Promise<Building> {
  return (await http.get<ApiResource<Building>>(`/buildings/${encodeURIComponent(id)}`, { signal })).data.data
}

export async function saveBuilding(input: BuildingInput, id?: number): Promise<Building> {
  await fetchCsrfCookie()
  const data = { name: input.name, address: input.address, total_floors: input.total_floors,
    latitude: input.latitude || null, longitude: input.longitude || null, description: input.description || null }
  const response = id === undefined
    ? await http.post<ApiResource<Building>>('/buildings', data)
    : await http.patch<ApiResource<Building>>(`/buildings/${id}`, data)
  return response.data.data
}
