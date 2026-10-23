import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { Service, ServicePage } from './types'
import type { ServiceInput, ServiceUpdateInput } from './schemas'

export async function getServices(page = 1, signal?: AbortSignal): Promise<ServicePage> {
  return (await http.get<ServicePage>('/services', { params: { page }, signal })).data
}
export async function createService(input: ServiceInput): Promise<Service> {
  await fetchCsrfCookie()
  const data = { code: input.code, name: input.name, billing_type: input.billing_type,
    unit: input.unit || null, price: input.price, description: input.description || null }
  return (await http.post<ApiResource<Service>>('/services', data)).data.data
}
export async function updateService(service: Service, input: ServiceUpdateInput): Promise<Service> {
  await fetchCsrfCookie()
  const data = { name: input.name, description: input.description || null,
    ...(service.billing_type === 'metered' ? {} : { price: input.price }) }
  return (await http.patch<ApiResource<Service>>(`/services/${service.id}`, data)).data.data
}
