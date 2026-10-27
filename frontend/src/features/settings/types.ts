export type DaySettingKey = 'invoice.due_days' | 'contract.expiring_warning_days'

export interface Setting {
  key: string
  value: string | null
  type: 'string' | 'integer' | 'boolean' | 'json'
  group: string
}

export interface SettingsResult {
  data: Setting[]
  missing_keys: string[]
}

export const daySettingLabels: Record<DaySettingKey, string> = {
  'invoice.due_days': 'Số ngày đến hạn thanh toán hóa đơn',
  'contract.expiring_warning_days': 'Số ngày cảnh báo hợp đồng sắp hết hạn',
}
