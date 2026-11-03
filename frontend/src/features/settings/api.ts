import { fetchCsrfCookie, http } from '@/lib/http'
import type { ApiResource } from '@/types/api'
import type { DaySettingInput } from './schemas'
import type { DaySettingKey, SystemSettingKey, Setting, SettingsResult } from './types'
import { systemSettingSchema, type SystemSettingInput } from './schemas'

export async function getSettings(signal?: AbortSignal): Promise<SettingsResult> {
  return (await http.get<SettingsResult>('/settings', { signal, timeout: 15000 })).data
}

export async function saveDaySetting(key: DaySettingKey, input: DaySettingInput): Promise<Setting> {
  await fetchCsrfCookie()
  return (await http.put<ApiResource<Setting>>(`/settings/${encodeURIComponent(key)}`, { value: Number(input.value) })).data.data
}

export async function saveSystemSetting(key: SystemSettingKey, input: SystemSettingInput, expectedValue: string | null): Promise<Setting> {
  const body = systemSettingSchema(key).parse(input)
  await fetchCsrfCookie()
  return (await http.put<ApiResource<Setting>>(`/settings/${encodeURIComponent(key)}`, {
    value: body.value || null, expected_value: expectedValue,
  })).data.data
}
