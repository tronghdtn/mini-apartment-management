import { z } from 'zod'
import { fitsTextColumn } from '../../lib/textLimits.ts'

const id = z.number({ error: 'Vui lòng chọn một mục hợp lệ.' }).int().positive('Vui lòng chọn một mục.').max(Number.MAX_SAFE_INTEGER)
const money = z.number({ error: 'Vui lòng nhập số tiền.' }).int('Số tiền phải là số nguyên đồng VND.')
  .min(0, 'Số tiền không được âm.').max(Number.MAX_SAFE_INTEGER, 'Số tiền vượt giới hạn xử lý an toàn.')
const date = z.iso.date({ error: 'Vui lòng nhập ngày hợp lệ.' })

export const draftContractSchema = z.object({
  room_id: id,
  user_id: id,
  start_date: date,
  end_date: date,
  monthly_rent: money,
  deposit_amount: money,
  occupant_count: z.number({ error: 'Vui lòng nhập số người ở.' }).int('Số người ở phải là số nguyên.')
    .min(1, 'Số người ở gồm cả người đại diện, phải từ 1.').max(65535, 'Số người ở vượt giới hạn.'),
  note: z.string().trim().refine(fitsTextColumn, 'Ghi chú quá dài. Vui lòng rút gọn nội dung.'),
}).strict().refine(input => input.end_date > input.start_date, {
  path: ['end_date'], message: 'Ngày cuối được ở phải sau ngày bắt đầu.',
})

export type DraftContractInput = z.infer<typeof draftContractSchema>

const filterId = z.string().regex(/^(?:|[1-9]\d*)$/, 'Mã lọc phải là số nguyên dương.')
  .refine(value => !value || Number.isSafeInteger(Number(value)), 'Mã lọc vượt giới hạn.')

export const contractFiltersSchema = z.object({
  status: z.enum(['', 'draft', 'active', 'terminated', 'expired'], { error: 'Trạng thái hợp đồng không hợp lệ.' }),
  building_id: filterId,
  room_id: filterId,
  user_id: filterId,
  q: z.string().trim().refine(value => Array.from(value).length <= 191, 'Từ khóa tối đa 191 ký tự.'),
}).strict()
export type ContractFilters = z.infer<typeof contractFiltersSchema>

export const draftContractServicesSchema = z.object({
  services: z.array(z.object({
    service_id: id,
    quantity: z.number({ error: 'Vui lòng nhập số lượng.' }).int('Số lượng phải là số nguyên.')
      .min(1, 'Số lượng phải từ 1.').max(99999999, 'Số lượng vượt giới hạn lưu trữ.'),
  }).strict()).refine(lines => new Set(lines.map(line => line.service_id)).size === lines.length, 'Không chọn trùng dịch vụ.'),
}).strict()
export type DraftContractServicesInput = z.infer<typeof draftContractServicesSchema>
