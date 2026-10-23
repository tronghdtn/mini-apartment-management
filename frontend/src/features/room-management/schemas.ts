import { z } from 'zod'
import { fitsTextColumn } from '../../lib/textLimits.ts'

const positiveSmallInteger = (label: string) => z.number({ error: `${label} phải là số.` })
  .int(`${label} phải là số nguyên.`).min(1, `${label} phải từ 1.`).max(65535, `${label} tối đa 65535.`)

const moneySchema = z.number({ error: 'Vui lòng nhập số tiền.' })
  .int('Số tiền phải là số nguyên đồng VND.').min(0, 'Số tiền không được âm.')
  .max(Number.MAX_SAFE_INTEGER, 'Số tiền vượt giới hạn xử lý an toàn.')

export const roomSchema = z.object({
  building_id: z.number({ error: 'Vui lòng chọn tòa nhà.' }).int().positive('Vui lòng chọn tòa nhà.').max(Number.MAX_SAFE_INTEGER),
  code: z.string().trim().min(1, 'Vui lòng nhập mã phòng.').max(50, 'Mã phòng tối đa 50 ký tự.'),
  floor_number: positiveSmallInteger('Tầng'),
  area: z.string().trim().regex(/^\d{1,6}(?:\.\d{1,2})?$/, 'Diện tích tối đa 6 chữ số nguyên và 2 chữ số thập phân.').refine(value => Number(value) > 0, 'Diện tích phải lớn hơn 0.'),
  base_price: moneySchema,
  deposit_amount: moneySchema,
  max_occupants: positiveSmallInteger('Sức chứa'),
  is_public: z.boolean(),
  description: z.string().trim().refine(fitsTextColumn, 'Mô tả quá dài. Vui lòng rút gọn nội dung.'),
})

export type RoomInput = z.infer<typeof roomSchema>
