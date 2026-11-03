import { z } from 'zod'

// Tổng nhiều hóa đơn giữ dạng chuỗi nguyên đồng do Backend cộng, không ép sang Number.
const aggregateVnd = z.string().regex(/^(0|[1-9]\d*)$/)
const count = z.number().int().nonnegative()
export const userDebtSummarySchema = z.object({
  outstanding_amount: aggregateVnd,
  outstanding_invoice_count: count,
  overdue_amount: aggregateVnd,
  overdue_invoice_count: count,
})
export type UserDebtSummary = z.infer<typeof userDebtSummarySchema>
