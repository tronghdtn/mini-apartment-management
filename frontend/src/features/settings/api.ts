import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { DaySettingInput } from './schemas'
import type { DaySettingKey, Setting, SettingsResult } from './types'

export async function getSettings(signal?: AbortSignal): Promise<SettingsResult> {
  return (await http.get<SettingsResult>('/settings', { signal, timeout: 15000 })).data
}

export async function saveDaySetting(key: DaySettingKey, input: DaySettingInput): Promise<Setting> {
  await fetchCsrfCookie()
  return (await http.put<ApiResource<Setting>>(`/settings/${encodeURIComponent(key)}`, { value: Number(input.value) })).data.data
}
