import { z } from 'zod'
import { fitsTextColumn } from '../../lib/textLimits.ts'

const inspectionPhotoSchema = z.custom<File>(value => typeof File !== 'undefined'
  && value instanceof File && value.size <= 5 * 1024 * 1024
  && ['image/jpeg', 'image/png', 'image/webp'].includes(value.type), 'Ảnh phải là JPG, PNG hoặc WebP và không vượt quá 5 MB.')

export const contractInspectionSchema = z.object({
  inspection_result: z.enum(['no_damage', 'damaged'], { error: 'Vui lòng chọn kết quả kiểm tra.' }),
  inspection_note: z.string().trim().refine(fitsTextColumn, 'Ghi chú vượt giới hạn lưu trữ.'),
  photos: z.array(inspectionPhotoSchema).max(5, 'Mỗi lần kiểm tra chỉ được tải lên tối đa 5 ảnh.'),
})

export type ContractInspectionInput = z.infer<typeof contractInspectionSchema>
