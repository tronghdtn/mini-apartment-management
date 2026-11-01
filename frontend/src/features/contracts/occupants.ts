import { z } from 'zod'

export const contractOccupantInputSchema = z.object({
  full_name: z.string().trim().min(1, 'Nhập họ tên người ở cùng.').max(120, 'Họ tên tối đa 120 ký tự.'),
  phone: z.string().trim().max(20, 'Số điện thoại tối đa 20 ký tự.'),
  relationship: z.string().trim().max(50, 'Quan hệ tối đa 50 ký tự.'),
})
const revisionSchema = z.string().regex(/^[a-f0-9]{64}$/)
export const contractOccupantsSchema = z.object({
  contract_id: z.number().int().positive(),
  contract_status: z.enum(['draft', 'active', 'terminated', 'expired']),
  occupant_count: z.number().int().positive(), max_occupants: z.number().int().positive(),
  registered_count: z.number().int().positive(), has_count_mismatch: z.boolean(), can_edit: z.boolean(),
  revision: revisionSchema,
  occupants: z.array(z.object({ id: z.number().int().positive(), full_name: z.string(),
    phone: z.string().nullable(), relationship: z.string().nullable() })),
})
export type ContractOccupantInput = z.infer<typeof contractOccupantInputSchema>
export type ContractOccupants = z.infer<typeof contractOccupantsSchema>
export type ContractOccupant = ContractOccupants['occupants'][number]
