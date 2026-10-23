import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { Amenity, AmenityPage } from './types'
import type { AmenityInput } from './schemas'

export async function getAmenities(page = 1, signal?: AbortSignal): Promise<AmenityPage> {
  return (await http.get<AmenityPage>('/amenities', { params: { page }, signal })).data
}

export async function saveAmenity(input: AmenityInput, id?: number): Promise<Amenity> {
  await fetchCsrfCookie()
  const data = { name: input.name, description: input.description || null }
  const response = id === undefined
    ? await http.post<ApiResource<Amenity>>('/amenities', data)
    : await http.patch<ApiResource<Amenity>>(`/amenities/${id}`, data)
  return response.data.data
}

export async function archiveAmenity(id: number): Promise<void> {
  await fetchCsrfCookie()
  await http.delete(`/amenities/${id}`)
}
