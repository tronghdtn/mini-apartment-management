import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { MeteredService, UtilityPrice, UtilityPricePage, UtilityBuilding } from './types'
import type { UtilityPriceInput } from './schemas'
import { utilityPriceSchema } from './schemas'

export async function getUtilityPrices(page: number, filters: { building_id: string; service_id: string }, signal?: AbortSignal): Promise<UtilityPricePage> {
  return (await http.get<UtilityPricePage>('/utility-prices', { params: { page, building_id: filters.building_id || undefined, service_id: filters.service_id || undefined }, signal, timeout: 15000 })).data
}
export async function getMeteredServices(signal?: AbortSignal): Promise<MeteredService[]> {
  const services: MeteredService[] = []
  let page = 1
  while (true) {
    const response = await http.get<{ data: (MeteredService & { billing_type: string })[]; meta: { last_page: number } }>('/services', { params: { page }, signal })
    services.push(...response.data.data.filter(service => service.billing_type === 'metered')
      .map(service => ({ id: service.id, code: service.code, name: service.name, unit: service.unit })))
    if (page >= response.data.meta.last_page) return services
    page += 1
  }
}
export async function createUtilityPrice(input: UtilityPriceInput): Promise<UtilityPrice> {
  const body = utilityPriceSchema.parse(input)
  await fetchCsrfCookie()
  return (await http.post<ApiResource<UtilityPrice>>('/utility-prices', body)).data.data
}

export async function getUtilityBuildings(signal?: AbortSignal): Promise<UtilityBuilding[]> {
  const buildings: UtilityBuilding[] = []
  for (let page = 1; ; page++) {
    const result = (await http.get<{ data: UtilityBuilding[]; meta: { last_page: number } }>('/buildings', { params: { page }, signal, timeout: 15000 })).data
    buildings.push(...result.data.map(({ id, name }) => ({ id, name })))
    if (page >= result.meta.last_page) return buildings
  }
}
