import { z } from 'zod'

const pageSchema = z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647, 'Trang không hợp lệ.')
export const debtFiltersSchema = z.object({
  status: z.enum(['all', 'overdue', 'not_due']),
  search: z.string().max(100),
  page: pageSchema,
})
export const debtSearchSchema = z.object({ search: z.string().trim().max(100, 'Tối đa 100 ký tự.') })
export type DebtFilters = z.infer<typeof debtFiltersSchema>
export type DebtSearch = z.infer<typeof debtSearchSchema>
