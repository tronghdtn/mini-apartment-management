import { http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { HealthStatus } from './types'

export async function getHealth(signal?: AbortSignal) {
  const response = await http.get<ApiResource<HealthStatus>>('/health', {
    signal,
    // 503 vẫn trả về body mô tả thành phần bị lỗi.
    validateStatus: (status) => status === 200 || status === 503,
  })
  return response.data.data
}
