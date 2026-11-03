import { z } from 'zod'

// Read-only projection of the existing contract list; keep private notes out of this panel.
export const userContractsQuerySchema = z.strictObject({
  user_id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  page: z.string().regex(/^[1-9]\d{0,8}$/, 'Trang hợp đồng không hợp lệ.').transform(Number),
})
export const userContractsPageSchema = z.object({
  data: z.array(z.object({
    id: z.number().int().positive(), contract_number: z.string().nullable(),
    status: z.enum(['draft', 'active', 'terminated', 'expired']), start_date: z.string(), end_date: z.string(),
    monthly_rent: z.number().int().nonnegative(),
    room: z.object({ id: z.number().int().positive(), code: z.string(), building: z.object({ name: z.string() }) }),
  })),
  meta: z.object({ current_page: z.number().int().positive(), last_page: z.number().int().positive(), total: z.number().int().nonnegative() }),
})
export type UserContractsPage = z.infer<typeof userContractsPageSchema>

export const userContractStatusLabels = { draft: 'Bản nháp', active: 'Đang hiệu lực', terminated: 'Đã thanh lý', expired: 'Hết hạn' }
