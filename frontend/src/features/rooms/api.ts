import { http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import { roomSearch } from './schemas'
import type { PublicRoomFilters } from './schemas'
import type { PublicRoom, PublicRoomOptions, PublicRoomPage } from './types'

const CACHE_TTL_MS = 60_000

const pageCache = new Map<string, { data: PublicRoomPage; ts: number }>()
const roomCache = new Map<string, { data: PublicRoom; ts: number }>()
let optionsCache: { data: PublicRoomOptions; ts: number } | null = null
let optionsInFlight: Promise<PublicRoomOptions> | null = null

function pageKey(page: number, filters: PublicRoomFilters): string {
  return roomSearch(filters, page).toString()
}

export function getCachedPublicRooms(page: number, filters: PublicRoomFilters): PublicRoomPage | null {
  const entry = pageCache.get(pageKey(page, filters))
  return entry ? entry.data : null
}

export function getCachedPublicRoom(id: string): PublicRoom | null {
  const entry = roomCache.get(id)
  return entry ? entry.data : null
}

export function getCachedPublicRoomOptions(): PublicRoomOptions | null {
  return optionsCache ? optionsCache.data : null
}

export async function getPublicRooms(
  page: number,
  filters: PublicRoomFilters,
  signal?: AbortSignal,
): Promise<PublicRoomPage> {
  const key = pageKey(page, filters)
  const cached = pageCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }

  const data = (
    await http.get<PublicRoomPage>('/public/rooms', {
      params: roomSearch(filters, page),
      signal,
      timeout: 15000,
    })
  ).data

  const now = Date.now()
  pageCache.set(key, { data, ts: now })
  for (const room of data.data) {
    roomCache.set(String(room.id), { data: room, ts: now })
  }
  return data
}

export async function getPublicRoom(id: string, signal?: AbortSignal): Promise<PublicRoom> {
  const cached = roomCache.get(id)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }

  const data = (
    await http.get<ApiResource<PublicRoom>>(`/public/rooms/${encodeURIComponent(id)}`, {
      signal,
      timeout: 15000,
    })
  ).data.data

  roomCache.set(id, { data, ts: Date.now() })
  return data
}

export async function getPublicRoomOptions(signal?: AbortSignal): Promise<PublicRoomOptions> {
  if (optionsCache && Date.now() - optionsCache.ts < CACHE_TTL_MS) {
    return optionsCache.data
  }
  if (optionsInFlight && !signal) {
    return optionsInFlight
  }

  const request = http
    .get<ApiResource<PublicRoomOptions>>('/public/rooms/filters', { signal, timeout: 15000 })
    .then((res) => {
      optionsCache = { data: res.data.data, ts: Date.now() }
      optionsInFlight = null
      return res.data.data
    })
    .catch((err) => {
      optionsInFlight = null
      throw err
    })

  if (!signal) {
    optionsInFlight = request
  }
  return request
}
