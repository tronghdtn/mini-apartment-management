import { http } from '@/lib/http'
import { dashboardSummarySchema } from './schemas'
import type { DashboardSummary } from './types'

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await http.get<{ data: DashboardSummary }>('/dashboard', { signal })
  return dashboardSummarySchema.parse(response.data.data)
}
