import { z } from 'zod'
import { uploadBudgetError } from '../../lib/uploadLimits.ts'
const photo = z.file('Chọn tệp ảnh hợp lệ.').min(1, 'Ảnh không được rỗng.')
  .max(5 * 1024 * 1024, 'Mỗi ảnh tối đa 5 MiB.')
  .mime(['image/jpeg', 'image/png', 'image/webp'], 'Chọn ảnh JPG, PNG hoặc WebP.')
export const roomPhotoUploadSchema = z.object({ photos: z.array(photo).min(1, 'Chọn ít nhất một ảnh.').max(20, 'Mỗi lần gửi tối đa 20 ảnh.') })
  .superRefine(({ photos }, context) => {
    if (photos.length <= 20) {
      const message = uploadBudgetError(photos)
      if (message) context.addIssue({ code: 'custom', path: ['photos'], message })
    }
  })
export const roomPhotoListSchema = z.array(z.object({ id: z.number().int().positive(),
  url: z.string().regex(/^\/api\/v1\/rooms\/\d+\/photos\/\d+\/content$/),
  is_cover: z.boolean(), sort_order: z.number().int().nonnegative() }))
export type RoomPhotoUploadInput = z.infer<typeof roomPhotoUploadSchema>
