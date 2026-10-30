import { z } from 'zod'

export const residentContractFiltersSchema = z.object({
  status: z.enum(['all', 'active', 'terminated', 'expired']),
  page: z.string().regex(/^[1-9]\d*$/).refine(value => Number(value) <= 2147483647),
})
