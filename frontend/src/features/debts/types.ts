export type DebtStatus = 'all' | 'overdue' | 'not_due'

export interface DebtInvoice {
  id: number
  invoice_number: string | null
  type: 'monthly' | 'final' | 'adjustment'
  period: string
  status: 'issued' | 'partially_paid'
  due_date: string | null
  total_amount: number
  paid_amount: number
  outstanding_amount: number
  is_overdue: boolean
}

export interface DebtContract {
  contract_id: number
  contract_number: string | null
  contract_status: string
  tenant: { id: number; full_name: string }
  room: { id: number; code: string; building_name: string }
  outstanding_amount: string
  overdue_amount: string
  invoice_count: number
  overdue_invoice_count: number
  oldest_overdue_due_date: string | null
  invoices: DebtInvoice[]
}

export interface DebtSummary {
  total_outstanding: string
  overdue_outstanding: string
  invoice_count: number
  debtor_count: number
}

export interface DebtPage {
  data: DebtContract[]
  links: { first: string | null; last: string | null; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  summary: DebtSummary
}
