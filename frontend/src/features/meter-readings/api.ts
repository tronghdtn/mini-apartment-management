import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import { meterContextSchema, meterFiltersSchema, meterPayloadSchema, type MeterFilters, type MeterPayload } from './schemas'
import type { MeterContext, MeterOptions, MeterReading, MeterReadingPage } from './types'

async function allOptions<T>(url: string, signal?: AbortSignal): Promise<T[]> {
  const result: T[] = []
  for (let page = 1; ; page++) {
    const response = (await http.get<{ data: T[]; meta: { last_page: number } }>(url, { params: { page }, signal, timeout: 15000 })).data
    result.push(...response.data)
    if (page >= response.meta.last_page) return result
  }
}
export async function getMeterOptions(signal?: AbortSignal): Promise<MeterOptions> {
  const [rooms, buildings, services] = await Promise.all([
    allOptions<MeterOptions['rooms'][number]>('/rooms', signal), allOptions<MeterOptions['buildings'][number]>('/buildings', signal),
    allOptions<MeterOptions['services'][number] & { billing_type: string; status: string }>('/services', signal),
  ])
  return { rooms, buildings, services: services.filter(service => ['ELECTRICITY', 'WATER'].includes(service.code) && service.billing_type === 'metered' && service.status === 'active') }
}
export async function getMeterReadings(input: MeterFilters, signal?: AbortSignal): Promise<MeterReadingPage> {
  const filters = meterFiltersSchema.parse(input)
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
  return (await http.get<MeterReadingPage>('/meter-readings', { params, signal, timeout: 15000 })).data
}
export async function getMeterContext(input: { room_id: number; service_id: number; period: string; reading_date: string }): Promise<MeterContext> {
  const { room_id, ...params } = meterContextSchema.parse(input)
  return (await http.get<ApiResource<MeterContext>>(`/rooms/${room_id}/meter-reading-context`, { params, timeout: 15000 })).data.data
}
export async function saveMeterReadings(input: MeterPayload): Promise<MeterReading[]> {
  const body = meterPayloadSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.post<{ data: MeterReading[] }>('/meter-readings', body, { timeout: 30000 })).data.data
}
