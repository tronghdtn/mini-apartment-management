import { z } from 'zod'
import type { TextSettingKey } from './types.ts'

export function systemSettingSchema(key: TextSettingKey) {
  const limit = key === 'system.contact_phone' ? 30 : key === 'bank.account_number' ? 20 : key.startsWith('bank.') ? 100 : 191
  let value = z.string().trim().refine(text => Array.from(text).length <= limit, `Tối đa ${limit} ký tự.`)
  if (key === 'system.contact_email') value = value.refine(text => text === '' || z.email().safeParse(text).success, 'Email liên hệ không đúng định dạng.')
  if (key === 'bank.account_number') value = value.refine(text => text === '' || /^[0-9]{6,20}$/.test(text), 'Số tài khoản chỉ gồm chữ số, từ 6 đến 20 ký tự.')
  return z.strictObject({ value })
}
export type SystemSettingInput = { value: string }

export const daySettingSchema = z.strictObject({
  value: z.string().trim().regex(/^\d{1,3}$/, 'Nhập số ngày nguyên từ 1 đến 365.')
    .refine(value => Number(value) >= 1 && Number(value) <= 365, 'Số ngày phải từ 1 đến 365.'),
})

export type DaySettingInput = z.infer<typeof daySettingSchema>
