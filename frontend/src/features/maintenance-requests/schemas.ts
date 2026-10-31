import { z } from 'zod'
import { fitsTextColumn } from '../../lib/textLimits.ts'

const priorities = ['low', 'normal', 'high', 'urgent'] as const
const textColumn = z.string().trim().refine(fitsTextColumn, 'Nội dung quá dài. Vui lòng rút gọn nội dung.')

export const maintenanceCreateSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề sự cố.').max(150, 'Tiêu đề tối đa 150 ký tự.'),
  description: textColumn.min(1, 'Vui lòng mô tả sự cố.'),
  priority: z.enum(priorities, { error: 'Vui lòng chọn mức ưu tiên.' }),
  photos: z.custom<FileList | undefined>().optional().refine(files => !files || files.length <= 5, 'Chỉ được gửi tối đa 5 ảnh.')
    .refine(files => !files || Array.from(files).every(file => file.size <= 5 * 1024 * 1024), 'Mỗi ảnh tối đa 5 MB.')
    .refine(files => !files || Array.from(files).every(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)), 'Ảnh phải là JPG, PNG hoặc WebP.'),
})

export const maintenanceNoteSchema = z.object({ note: textColumn.min(1, 'Vui lòng nhập ghi chú.') })

export const maintenanceUpdateSchema = z.object({
  priority: z.enum(priorities),
  admin_note: textColumn,
})

export const maintenanceAssignmentSchema = z.object({
  assigned_to: z.number({ error: 'Vui lòng chọn kỹ thuật viên.' }).int().positive('Vui lòng chọn kỹ thuật viên.'),
  priority: z.enum(priorities).optional(),
  admin_note: textColumn,
})

export type MaintenanceCreateInput = z.input<typeof maintenanceCreateSchema>
export type MaintenanceNoteInput = z.infer<typeof maintenanceNoteSchema>
export type MaintenanceUpdateInput = z.infer<typeof maintenanceUpdateSchema>
export type MaintenanceAssignmentInput = z.infer<typeof maintenanceAssignmentSchema>
