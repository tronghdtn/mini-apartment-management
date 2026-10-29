import { z } from 'zod'
export const notificationFiltersSchema = z.object({
  status: z.enum(['all', 'unread']),
  page: z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647),
})
