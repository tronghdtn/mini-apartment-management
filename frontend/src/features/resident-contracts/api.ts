import { http } from '@/lib/http'
import { residentContractFiltersSchema } from './schemas'
import type { ResidentContractDetail, ResidentContractPage } from './types'

export async function getResidentContracts(filters: { status: string; page: string }, signal?: AbortSignal) {
  const parsed = residentContractFiltersSchema.parse(filters)
  return (await http.get<ResidentContractPage>('/resident/contracts', { params: { ...parsed, status: parsed.status === 'all' ? undefined : parsed.status }, signal })).data
}
export async function getResidentContract(id: string, signal?: AbortSignal) {
  return (await http.get<{ data: ResidentContractDetail }>(`/resident/contracts/${encodeURIComponent(id)}`, { signal })).data.data
}
