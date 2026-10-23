import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { AmenityAssignment, AmenityOption, AmenityTargetType } from './types'
import type { AmenityAssignmentInput } from './schemas'

export async function getAmenityAssignment(targetType: AmenityTargetType, targetId: number, signal?: AbortSignal): Promise<AmenityAssignment> {
  return (await http.get<ApiResource<AmenityAssignment>>(`/${targetType}/${targetId}/amenities`, { signal })).data.data
}

export async function getAmenityOptions(signal?: AbortSignal): Promise<AmenityOption[]> {
  const options: AmenityOption[] = []
  let page = 1
  while (true) {
    const response = await http.get<{ data: AmenityOption[]; meta: { last_page: number } }>('/amenities', { params: { page }, signal })
    options.push(...response.data.data.map(amenity => ({ id: amenity.id, name: amenity.name, description: amenity.description })))
    if (page >= response.data.meta.last_page) return options
    page += 1
  }
}

export async function saveAmenityAssignment(targetType: AmenityTargetType, targetId: number, input: AmenityAssignmentInput): Promise<AmenityAssignment> {
  await fetchCsrfCookie()
  return (await http.put<ApiResource<AmenityAssignment>>(`/${targetType}/${targetId}/amenities`, {
    amenity_ids: input.amenity_ids,
  })).data.data
}
