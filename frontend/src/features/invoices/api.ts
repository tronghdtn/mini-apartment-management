import { http } from '@/lib/http'
import { createInvoiceSchema, invoiceFiltersSchema, otherChargeSchema, type CreateInvoiceInput, type InvoiceFilters, type OtherChargeInput } from './schemas'
import type { Invoice, InvoiceContractOption, InvoicePage } from './types'
export async function getInvoices(filters: InvoiceFilters, signal?: AbortSignal): Promise<InvoicePage> {
  const input = invoiceFiltersSchema.parse(filters)
  return (await http.get<InvoicePage>('/invoices', { params: { page: input.page, status: input.status || undefined, period: input.period || undefined, overdue: input.overdue || undefined, contract_id: input.contract_id ? Number(input.contract_id) : undefined }, signal })).data
}
export async function getInvoice(id: string, signal?: AbortSignal) { return (await http.get<{ data: Invoice }>(`/invoices/${encodeURIComponent(id)}`, { signal })).data.data }
/** Newest final (including a cancelled source) provides a recovery link after F5 or a lost response. */
export async function getLatestFinalInvoice(contractId: number, signal?: AbortSignal): Promise<Invoice | null> {
  const response = await http.get<InvoicePage>('/invoices', { params: { contract_id: contractId, type: 'final', page: 1 }, signal })
  return response.data.data[0] ?? null
}
export async function createInvoice(input: CreateInvoiceInput) { return (await http.post<{ data: Invoice }>('/invoices', createInvoiceSchema.parse(input))).data.data }
export async function invoiceAction(id: number, action: 'refresh' | 'issue' | 'cancel', expected_revision: string, reason?: string) {
  return (await http.post<{ data: Invoice }>(`/invoices/${id}/${action}`, { expected_revision, ...(reason ? { reason } : {}) })).data.data
}
export async function reissueFinalInvoice(id: number, expected_revision: string) {
  return (await http.post<{ data: Invoice }>(`/invoices/${id}/reissue`, { expected_revision })).data.data
}
export async function saveOtherCharge(id: number, expected_revision: string, input: OtherChargeInput, itemId?: number) {
  const body = { ...otherChargeSchema.parse(input), expected_revision }
  return (itemId === undefined ? await http.post<{ data: Invoice }>(`/invoices/${id}/other-items`, body)
    : await http.patch<{ data: Invoice }>(`/invoices/${id}/other-items/${itemId}`, body)).data.data
}
export async function removeOtherCharge(id: number, itemId: number, expected_revision: string, reason: string) {
  return (await http.delete<{ data: Invoice }>(`/invoices/${id}/other-items/${itemId}`, { data: { expected_revision, reason } })).data.data
}
export async function getInvoiceContracts(signal?: AbortSignal): Promise<InvoiceContractOption[]> {
  const rows: InvoiceContractOption[] = []
  for (let page = 1; ; page += 1) {
    const response = await http.get<{ data: InvoiceContractOption[]; meta: { last_page: number } }>('/contracts', { params: { status: 'active', page }, signal })
    rows.push(...response.data.data)
    if (page >= response.data.meta.last_page) return rows
  }
}
