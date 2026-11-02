import { z } from 'zod'

// Tổng nhiều hóa đơn giữ dạng chuỗi nguyên đồng do Backend cộng, không ép sang Number.
const aggregateVnd = z.string().regex(/^(0|[1-9]\d*)$/)
const count = z.number().int().nonnegative()
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const residentOverviewSchema = z.object({
  today: date,
  active_contract: z.object({
    id: z.number().int().positive(),
    contract_number: z.string().nullable(),
    start_date: date,
    end_date: date,
    planned_handover_date: date,
    due_state: z.enum(['expiring', 'overdue']).nullable(),
    expiring_warning_days: count,
    room: z.object({ code: z.string(), building_name: z.string(), address: z.string() }),
  }).nullable(),
  debt: z.object({
    outstanding_amount: aggregateVnd,
    outstanding_invoice_count: count,
    overdue_amount: aggregateVnd,
    overdue_invoice_count: count,
  }),
})
