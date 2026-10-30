import { z } from 'zod'

export const terminateContractSchema = z.object({
  expected_revision: z.string().regex(/^[a-f0-9]{64}$/, 'Vui lòng tải lại đối soát.'),
  confirmed: z.boolean().refine(value => value, 'Vui lòng xác nhận đã kiểm tra đối soát.'),
}).strict()
export type TerminateContractInput = z.infer<typeof terminateContractSchema>
export interface ContractSettlement {
  contract_id: number
  status: 'active' | 'terminated'
  room_status: 'available' | 'occupied' | 'maintenance' | 'inactive'
  actual_end_date: string | null
  closed_at: string | null
  deposit_status: 'unpaid' | 'held' | 'settled'
  deposit_settled_at: string | null
  held_amount: number
  deposit_deducted_amount: number
  deposit_refund_amount: number
  refund_recording: 'unpaid_obligation'
  outstanding_amount: string
  outstanding_after: string
  pending_payment_count: number
  pending_payment_ids: number[]
  invoices: { id: number; invoice_number: string | null; type: string; due_date: string; outstanding_amount: number; deposit_applied: number; outstanding_after: number }[]
  deposit_payments: { id: number; invoice_id: number; amount: number; receipt_number: string | null }[]
  can_terminate: boolean
  is_preview: boolean
  blockers: string[]
  revision: string
  already_terminated: boolean
}
