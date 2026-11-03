export type DaySettingKey = 'invoice.due_days' | 'contract.expiring_warning_days'
export type SystemSettingKey = 'system.name' | 'system.contact_phone' | 'system.contact_email'
export const systemSettingLabels: Record<SystemSettingKey, string> = {
  'system.name': 'Tên hệ thống', 'system.contact_phone': 'Số điện thoại liên hệ', 'system.contact_email': 'Email liên hệ',
}
/** DB-D94: thông tin nhận chuyển khoản, chỉ để hướng dẫn cư dân; không kết nối ngân hàng. */
export type BankSettingKey = 'bank.name' | 'bank.account_number' | 'bank.account_holder'
export const bankSettingLabels: Record<BankSettingKey, string> = {
  'bank.name': 'Tên ngân hàng', 'bank.account_number': 'Số tài khoản', 'bank.account_holder': 'Chủ tài khoản',
}
/** Khóa văn bản ghi theo giá trị đã đọc (CAS). */
export type TextSettingKey = SystemSettingKey | BankSettingKey
export const textSettingLabels: Record<TextSettingKey, string> = { ...systemSettingLabels, ...bankSettingLabels }

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
