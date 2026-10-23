import { z } from 'zod'
import { fitsTextColumn } from '../../lib/textLimits.ts'

const nameSchema = z.string().trim().min(1, 'Vui lòng nhập tên dịch vụ.').max(120, 'Tên dịch vụ tối đa 120 ký tự.')
const descriptionSchema = z.string().trim().refine(fitsTextColumn, 'Mô tả quá dài. Vui lòng rút gọn nội dung.')
const priceSchema = z.number({ error: 'Vui lòng nhập số tiền.' }).int('Đơn giá phải là số nguyên đồng VND.')
  .min(0, 'Đơn giá không được âm.').max(Number.MAX_SAFE_INTEGER, 'Đơn giá vượt giới hạn xử lý an toàn.')

export const serviceSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Vui lòng nhập mã dịch vụ.').max(50, 'Mã dịch vụ tối đa 50 ký tự.')
    .refine(value => value !== 'ELECTRICITY' && value !== 'WATER', 'Mã này dành riêng cho dịch vụ hệ thống.'),
  name: nameSchema,
  billing_type: z.enum(['per_room', 'per_person', 'per_unit'], { error: 'Vui lòng chọn cách tính phí dịch vụ thường.' }),
  unit: z.string().trim().max(20, 'Đơn vị tính tối đa 20 ký tự.'),
  price: priceSchema,
  description: descriptionSchema,
})
export const serviceUpdateSchema = z.object({ name: nameSchema, price: priceSchema.nullable(), description: descriptionSchema })
export type ServiceInput = z.infer<typeof serviceSchema>
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>
