import { fetchCsrfCookie, http } from '@/lib/http'
import type { z } from 'zod'
import { notificationFiltersSchema } from './schemas'
import type { NotificationItem, NotificationPage } from './types'

export async function getNotifications(input: z.infer<typeof notificationFiltersSchema>, signal?: AbortSignal) {
  return (await http.get<NotificationPage>('/notifications', { params: notificationFiltersSchema.parse(input), signal })).data
}
export async function readNotification(id: string) {
  await fetchCsrfCookie()
  return (await http.post<{ data: NotificationItem }>(`/notifications/${encodeURIComponent(id)}/read`)).data.data
}
