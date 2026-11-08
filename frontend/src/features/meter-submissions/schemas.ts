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

/**
 * Form cư dân gửi điện và nước trong một lần: một tháng tiêu thụ, một ngày đọc số, mỗi đồng hồ một số + một ảnh.
 * Đồng hồ để trống cả số lẫn ảnh thì bỏ qua; cần ít nhất một đồng hồ. Mỗi đồng hồ vẫn gửi thành một yêu cầu riêng như API hiện có.
 */
const readingPattern = /^\d{1,8}(?:\.\d{1,2})?$/
const isFile = (value: unknown): value is File => typeof File !== 'undefined' && value instanceof File
export const meterBatchSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Chọn tháng tiêu thụ.'),
  reading_date: date,
  entries: z.array(z.object({ service_id: z.number().int().positive(), current_reading: z.string(), photo: z.custom<File | undefined>(() => true) })),
}).superRefine((value, ctx) => {
  const filled = value.entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.current_reading.trim() !== '' || entry.photo !== undefined)
  if (!filled.length) ctx.addIssue({ code: 'custom', path: ['entries'], message: 'Nhập số và ảnh cho ít nhất một đồng hồ (điện hoặc nước).' })
  if (/^\d{4}-\d{2}$/.test(value.month) && value.reading_date < `${value.month}-01`) ctx.addIssue({ code: 'custom', path: ['reading_date'], message: 'Ngày đọc số không được trước tháng tiêu thụ.' })
  for (const { entry, index } of filled) {
    if (!readingPattern.test(entry.current_reading.trim())) ctx.addIssue({ code: 'custom', path: ['entries', index, 'current_reading'], message: 'Nhập số trên đồng hồ, tối đa hai số thập phân (VD: 1250.5).' })
    if (!isFile(entry.photo) || !validMeterPhoto(entry.photo)) ctx.addIssue({ code: 'custom', path: ['entries', index, 'photo'], message: 'Chọn một ảnh JPG/PNG/WebP không quá 5 MB.' })
  }
})
export type MeterBatchInput = z.infer<typeof meterBatchSchema>

/** Đổi form đã hợp lệ thành các yêu cầu gửi API, giữ chỉ số thứ tự đồng hồ để báo lỗi đúng chỗ. */
export function toSubmissions(value: MeterBatchInput): { index: number; input: SubmissionInput }[] {
  return value.entries.flatMap((entry, index) => entry.current_reading.trim() === '' && entry.photo === undefined ? [] : [{
    index,
    input: submissionSchema.parse({ service_id: entry.service_id, period: `${value.month}-01`, reading_date: value.reading_date, current_reading: entry.current_reading.trim(), photo: entry.photo }),
  }])
}
