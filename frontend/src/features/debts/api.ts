import { http } from '@/lib/http'
import { debtFiltersSchema, type DebtFilters } from './schemas'
import type { DebtPage } from './types'

export async function getDebts(filters: DebtFilters, signal?: AbortSignal): Promise<DebtPage> {
  const input = debtFiltersSchema.parse(filters)
  return (await http.get<DebtPage>('/debts', {
    params: { status: input.status === 'all' ? undefined : input.status, search: input.search || undefined, page: Number(input.page) },
    signal,
  })).data
}
