import { z } from 'zod'

export const terminateContractSchema = z.object({
  expected_revision: z.string().regex(/^[a-f0-9]{64}$/, 'Vui lòng tải lại đối soát.'),
  confirmed: z.boolean().refine(value => value, 'Vui lòng xác nhận đã kiểm tra đối soát.'),
}).strict()
export type TerminateContractInput = z.infer<typeof terminateContractSchema>

export const confirmDepositRefundSchema = z.object({
  expected_revision: z.string().regex(/^[a-f0-9]{64}$/, 'Vui lòng tải lại đối soát.'),
  expected_refund_amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  confirmed_paid: z.boolean().refine(value => value, 'Cần xác nhận đã hoàn đủ tiền cọc ngoài hệ thống.'),
}).strict()
export type ConfirmDepositRefundInput = z.infer<typeof confirmDepositRefundSchema>

/** Missing fields mean the environment has not received the separately approved schema upgrade. */
export function canConfirmDepositRefund(data: ContractSettlement): boolean {
  return data.status === 'terminated' && data.deposit_status === 'settled'
    && data.deposit_refunded_at === null && data.deposit_refunded_by === null
    && data.deposit_refund_amount > 0 && data.refund_outstanding_amount === data.deposit_refund_amount
}
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
  deposit_refunded_at?: string | null
  deposit_refunded_by?: number | null
  refund_outstanding_amount?: number
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
