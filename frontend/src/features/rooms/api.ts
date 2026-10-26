import { http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import { roomSearch } from './schemas'
import type { PublicRoomFilters } from './schemas'
import type { PublicRoom, PublicRoomOptions, PublicRoomPage } from './types'

export async function getPublicRooms(page: number, filters: PublicRoomFilters, signal?: AbortSignal): Promise<PublicRoomPage> {
  return (await http.get<PublicRoomPage>('/public/rooms', { params: roomSearch(filters, page), signal, timeout: 15000 })).data
}

export async function getPublicRoom(id: string, signal?: AbortSignal): Promise<PublicRoom> {
  return (await http.get<ApiResource<PublicRoom>>(`/public/rooms/${encodeURIComponent(id)}`, { signal, timeout: 15000 })).data.data
}

export async function getPublicRoomOptions(signal?: AbortSignal): Promise<PublicRoomOptions> {
  return (await http.get<ApiResource<PublicRoomOptions>>('/public/rooms/filters', { signal, timeout: 15000 })).data.data
}
