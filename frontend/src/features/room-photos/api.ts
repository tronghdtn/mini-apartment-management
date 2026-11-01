import { fetchCsrfCookie, http } from '@/lib/http'
import type { RoomPhoto } from '@/types/roomPhotos'
import { roomPhotoListSchema, roomPhotoUploadSchema } from './schemas'
import type { RoomPhotoUploadInput } from './schemas'
const path = (roomId: number) => `/rooms/${roomId}/photos`
export async function getRoomPhotos(roomId: number, signal?: AbortSignal): Promise<RoomPhoto[]> {
  return roomPhotoListSchema.parse((await http.get<{ data: RoomPhoto[] }>(path(roomId), { signal })).data.data)
}
export async function uploadRoomPhotos(roomId: number, input: RoomPhotoUploadInput): Promise<RoomPhoto[]> {
  const data = roomPhotoUploadSchema.parse(input), body = new FormData()
  data.photos.forEach(file => body.append('photos[]', file))
  await fetchCsrfCookie()
  return roomPhotoListSchema.parse((await http.post<{ data: RoomPhoto[] }>(path(roomId), body)).data.data)
}
export async function setRoomCover(roomId: number, photoId: number, expectedCoverId: number | null): Promise<RoomPhoto[]> {
  await fetchCsrfCookie()
  return roomPhotoListSchema.parse((await http.put<{ data: RoomPhoto[] }>(`${path(roomId)}/${photoId}/cover`, { expected_cover_id: expectedCoverId })).data.data)
}
export async function removeRoomPhoto(roomId: number, photoId: number): Promise<void> {
  await fetchCsrfCookie()
  await http.delete(`${path(roomId)}/${photoId}`)
}
