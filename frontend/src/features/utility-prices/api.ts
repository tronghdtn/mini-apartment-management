import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { MeteredService, UtilityPrice, UtilityPricePage } from './types'
import type { UtilityPriceInput } from './schemas'

export async function getUtilityPrices(page: number, serviceId: string, signal?: AbortSignal): Promise<UtilityPricePage> {
  return (await http.get<UtilityPricePage>('/utility-prices', { params: { page, service_id: serviceId || undefined }, signal })).data
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
  await fetchCsrfCookie()
  return (await http.post<ApiResource<UtilityPrice>>('/utility-prices', {
    service_id: input.service_id, unit_price: input.unit_price, effective_from: input.effective_from,
  })).data.data
}
