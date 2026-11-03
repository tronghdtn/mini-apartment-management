export type DaySettingKey = 'invoice.due_days' | 'contract.expiring_warning_days'
export type SystemSettingKey = 'system.name' | 'system.contact_phone' | 'system.contact_email'
export const systemSettingLabels: Record<SystemSettingKey, string> = {
  'system.name': 'Tên hệ thống', 'system.contact_phone': 'Số điện thoại liên hệ', 'system.contact_email': 'Email liên hệ',
}

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
