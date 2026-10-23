import { z } from 'zod'

export const amenityAssignmentSchema = z.object({
  amenity_ids: z.array(z.number({ error: 'Mã tiện nghi phải là số.' })
    .int('Mã tiện nghi phải là số nguyên.').positive('Mã tiện nghi phải lớn hơn 0.')
    .max(Number.MAX_SAFE_INTEGER, 'Mã tiện nghi vượt giới hạn xử lý an toàn.'))
    .refine(ids => new Set(ids).size === ids.length, 'Không được chọn trùng tiện nghi.'),
})

export type AmenityAssignmentInput = z.infer<typeof amenityAssignmentSchema>
