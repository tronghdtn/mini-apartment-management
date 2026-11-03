import { z } from 'zod'

// Tổng nhiều khoản tiền giữ dạng chuỗi nguyên đồng, không ép sang Number.
const aggregateVnd = z.string().regex(/^(0|[1-9]\d*)$/)
export const dashboardSummarySchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  rented_rooms_count: z.number().int().nonnegative(),
  received_amount: aggregateVnd,
  outstanding_amount: aggregateVnd,
  pending_maintenance_count: z.number().int().nonnegative(),
})

export const dashboardPageSchema = z.string().regex(/^[1-9]\d*$/, 'Trang tòa nhà không hợp lệ.')
  .refine(value => Number(value) <= 2147483647, 'Số trang vượt giới hạn.').transform(Number)
const count = z.number().int().nonnegative()
export const dashboardCountPageSchema = z.object({ meta: z.object({ total: count }) })
export const dashboardBuildingsSchema = z.object({
  data: z.array(z.object({ id: z.number().int().positive(), name: z.string(), rooms_count: count, rented_rooms_count: count, available_rooms_count: count })),
  meta: z.object({ current_page: z.number().int().positive(), last_page: z.number().int().positive(), total: count }),
})
export const dashboardAppointmentsSchema = z.object({
  data: z.array(z.object({ id: z.number().int().positive(), code: z.string().nullable(), guest_name: z.string(), preferred_at: z.iso.datetime(),
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']), room: z.object({ id: z.number().int().positive(), code: z.string(), building_name: z.string() }) })),
  meta: z.object({ total: count }),
})
