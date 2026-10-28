import { z } from 'zod'

const identifier = z.number({ error: 'Vui lòng chọn dữ liệu.' }).int().positive('Vui lòng chọn dữ liệu.').max(Number.MAX_SAFE_INTEGER)
const date = z.iso.date({ error: 'Ngày phải hợp lệ, đúng định dạng năm-tháng-ngày.' }).refine(value => value >= '1000-01-01', 'Năm phải từ 1000 đến 9999.')
const period = date.refine(value => value.endsWith('-01'), 'Kỳ tiêu thụ phải là ngày 01 của tháng.')
const reading = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/, 'Chỉ số từ 0 đến 99999999.99, tối đa hai số thập phân.')
export const meterContextSchema = z.object({ room_id: identifier, service_id: identifier, period, reading_date: date })
  .refine(value => value.reading_date >= value.period, { path: ['reading_date'], message: 'Ngày đo không được trước kỳ tiêu thụ.' })
export const meterEntrySchema = meterContextSchema.safeExtend({ current_reading: reading })
export const meterPayloadSchema = z.object({ readings: z.array(meterEntrySchema).min(1).max(100) }).superRefine((value, context) => {
  const keys = new Set<string>()
  value.readings.forEach((entry, index) => {
    const key = `${entry.room_id}:${entry.service_id}`
    if (keys.has(key)) context.addIssue({ code: 'custom', path: ['readings', index, 'room_id'], message: 'Phòng/dịch vụ bị trùng trong lượt nhập.' })
    keys.add(key)
  })
})
export const meterFormSchema = z.object({ building_id: identifier, service_id: identifier, period, reading_date: date,
  rows: z.array(z.object({ room_id: identifier, current_reading: reading })).min(1, 'Cần ít nhất một dòng.').max(100, 'Tối đa 100 dòng một lượt.') })
  .superRefine((value, context) => {
    if (value.reading_date < value.period) context.addIssue({ code: 'custom', path: ['reading_date'], message: 'Ngày đo không được trước kỳ tiêu thụ.' })
    const ids = new Set<number>()
    value.rows.forEach((row, index) => {
      if (ids.has(row.room_id)) context.addIssue({ code: 'custom', path: ['rows', index, 'room_id'], message: 'Phòng bị trùng trong lượt nhập.' })
      ids.add(row.room_id)
    })
  })
const filterId = z.string().regex(/^(?:|[1-9]\d*)$/, 'Mã lọc không hợp lệ.').refine(value => !value || Number.isSafeInteger(Number(value)), 'Mã lọc vượt giới hạn.')
export const meterFiltersSchema = z.object({ building_id: filterId, room_id: filterId, service_id: filterId, period: z.union([z.literal(''), period]),
  kind: z.enum(['', 'periodic', 'final']), page: z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647) })
export type MeterFormInput = z.infer<typeof meterFormSchema>
export type MeterPayload = z.infer<typeof meterPayloadSchema>
export type MeterFilters = z.infer<typeof meterFiltersSchema>
