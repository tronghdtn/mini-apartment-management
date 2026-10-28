import { z } from 'zod'

export function validMeterPhoto(photo: { name: string; type: string; size: number }) {
  return /\.(jpe?g|png|webp)$/i.test(photo.name) && ['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) && photo.size > 0 && photo.size <= 5 * 1024 * 1024
}
const date = z.iso.date({ error: 'Ngày không hợp lệ.' }).refine(value => value >= '1000-01-01', 'Năm phải từ 1000 đến 9999.')
export const submissionSchema = z.object({ service_id: z.number().int().positive('Vui lòng chọn Điện/Nước.'),
  period: date.refine(value => value.endsWith('-01'), 'Kỳ tiêu thụ phải là ngày 01.'), reading_date: date,
  current_reading: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/, 'Chỉ số từ 0 đến 99999999.99, tối đa hai số thập phân.'),
  photo: z.custom<File>(value => typeof File !== 'undefined' && value instanceof File && validMeterPhoto(value), 'Chọn một ảnh JPG/PNG/WebP không quá 5 MB.') })
  .refine(value => value.reading_date >= value.period, { path: ['reading_date'], message: 'Ngày đo không được trước kỳ tiêu thụ.' })
export const rejectionSchema = z.object({ rejection_reason: z.string().trim().min(1, 'Cần lý do từ chối.').max(2000, 'Tối đa 2000 ký tự.') })
export type SubmissionInput = z.infer<typeof submissionSchema>
export type RejectionInput = z.infer<typeof rejectionSchema>
