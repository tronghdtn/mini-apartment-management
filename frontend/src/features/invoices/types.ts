export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled'
export interface InvoiceItem { id: number; item_type: string; description: string; quantity: string; unit_price: number; amount: number; basis: string | null; evidence_urls: string[]; calculation: { active_days?: number; days_in_month?: number; period?: string } | null }
export interface Invoice {
  contract_closure_note?: string | null
  id: number; invoice_number: string | null; contract_id: number; contract_number: string | null; tenant_name: string
  room: { id: number; code: string; building_name: string }; type: 'monthly' | 'final' | 'adjustment'; period: string; status: InvoiceStatus
  total_amount: number; paid_amount: number; outstanding_amount: number; due_date: string | null; issued_at: string | null
  is_overdue: boolean; related_invoice_id: number | null; replacement_invoice_id?: number | null; cancel_reason: string | null; revision: string | null; items?: InvoiceItem[]
  manual_history?: { id: number; voided: boolean; audit: { action: string; actor_id: number; at: string; reason: string; before: { description: string; amount: number; basis: string } | null; after: { description: string; amount: number; basis: string } | null }[] }[]
  meter_readings?: { id: number; service: string; period: string; previous_reading: string; current_reading: string; consumption: string; unit_price: number; amount: number }[]
}
export interface InvoicePage { data: Invoice[]; meta: { current_page: number; last_page: number; total: number } }
export interface InvoiceContractOption { id: number; contract_number: string | null; room: { code: string; building: { name: string } }; tenant: { full_name: string } }
export const invoiceStatusLabels: Record<InvoiceStatus, string> = { draft: 'Bản nháp', issued: 'Đã phát hành', partially_paid: 'Thanh toán một phần', paid: 'Đã tất toán', cancelled: 'Đã hủy' }
