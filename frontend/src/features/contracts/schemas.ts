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

export const contractTermsSchema = z.object({
  early_termination_fee_type: z.enum(['', 'none', 'fixed', 'rent_multiple']),
  early_termination_fee_amount: money.nullable(),
  early_termination_fee_multiplier: z.string().nullable(),
  early_termination_waiver_conditions: z.array(z.object({
    code: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$/, 'Mã 1–50 ký tự chữ, số, gạch ngang hoặc gạch dưới.'),
    description: z.string().trim().min(1, 'Nhập nội dung điều kiện đã thỏa thuận.'),
  }).strict()).refine(items => new Set(items.map(item => item.code)).size === items.length, 'Không được trùng mã điều kiện.'),
}).strict().superRefine((input, context) => {
  if (input.early_termination_fee_type === 'fixed' && input.early_termination_fee_amount === null) context.addIssue({ code: 'custom', path: ['early_termination_fee_amount'], message: 'Nhập số tiền phí đã thỏa thuận.' })
  if (input.early_termination_fee_type === 'rent_multiple' && (!/^\d{1,3}(?:\.\d{1,2})?$/.test(input.early_termination_fee_multiplier ?? '') || Number(input.early_termination_fee_multiplier) <= 0)) context.addIssue({ code: 'custom', path: ['early_termination_fee_multiplier'], message: 'Hệ số từ 0.01 đến 999.99, tối đa hai số thập phân.' })
})
export type ContractTermsInput = z.infer<typeof contractTermsSchema>

export const activateContractSchema = z.object({
  initial_electricity_reading: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/, 'Nhập chỉ số từ 0 đến 99999999.99, tối đa hai số thập phân.'),
  initial_water_reading: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/, 'Nhập chỉ số từ 0 đến 99999999.99, tối đa hai số thập phân.'),
  meter_gap_reason: z.string().trim().refine(fitsTextColumn, 'Lý do quá dài.'),
  meter_gap_confirmed: z.boolean(),
}).strict()
export type ActivateContractInput = z.infer<typeof activateContractSchema>
