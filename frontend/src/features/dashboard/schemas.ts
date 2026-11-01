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
