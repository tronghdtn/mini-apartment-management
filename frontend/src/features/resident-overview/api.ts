import { http } from '@/lib/http'
import { residentOverviewSchema } from './schemas'
import type { ResidentOverview } from './types'

export async function getResidentOverview(signal?: AbortSignal): Promise<ResidentOverview> {
  const response = await http.get<{ data: ResidentOverview }>('/resident/overview', { signal })
  return residentOverviewSchema.parse(response.data.data)
}
