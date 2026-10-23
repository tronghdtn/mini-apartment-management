import { z } from 'zod'
import { fitsTextColumn } from '../../lib/textLimits.ts'

export const amenitySchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên tiện nghi.').max(120, 'Tên tối đa 120 ký tự.'),
  description: z.string().trim().refine(fitsTextColumn, 'Mô tả quá dài. Vui lòng rút gọn nội dung.'),
})

export type AmenityInput = z.infer<typeof amenitySchema>
