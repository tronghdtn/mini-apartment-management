import { z } from 'zod'

export const daySettingSchema = z.strictObject({
  value: z.string().trim().regex(/^\d{1,3}$/, 'Nhập số ngày nguyên từ 1 đến 365.')
    .refine(value => Number(value) >= 1 && Number(value) <= 365, 'Số ngày phải từ 1 đến 365.'),
})

export type DaySettingInput = z.infer<typeof daySettingSchema>
