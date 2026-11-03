import { http } from '@/lib/http'
import { paymentFiltersSchema, paymentProofSchema, directPaymentSchema, type PaymentFilters, type PaymentProofInput, type DirectPaymentInput } from './schemas'
import type { Payment, PaymentInstructions, PaymentPage } from './types'
export async function getPayments(filters: PaymentFilters, signal?: AbortSignal): Promise<PaymentPage> {
  const input = paymentFiltersSchema.parse(filters)
  return (await http.get<PaymentPage>('/payments',{params:{status:input.status||undefined,method:input.method||undefined,invoice_id:input.invoice_id||undefined,page:input.page},signal})).data
}
export async function getPaymentInstructions(invoiceId: number, signal?: AbortSignal): Promise<PaymentInstructions> {
  return (await http.get<{ data: PaymentInstructions }>(`/invoices/${invoiceId}/payment-instructions`, { signal })).data.data
}
export async function getPayment(id: string, signal?: AbortSignal): Promise<Payment> {
  return (await http.get<{ data: Payment }>(`/payments/${encodeURIComponent(id)}`, { signal })).data.data
}
export async function submitPaymentProof(invoiceId:number,input:PaymentProofInput) {
  const valid=paymentProofSchema.parse(input), body=new FormData()
  body.append('amount',String(valid.amount)); body.append('proof',valid.proof!)
  return (await http.post<{data:Payment}>(`/invoices/${invoiceId}/payments`,body)).data.data
}
export async function recordDirectPayment(invoiceId:number,revision:string,input:DirectPaymentInput) {
  return (await http.post<{data:Payment}>(`/invoices/${invoiceId}/payments`,{...directPaymentSchema.parse(input),expected_revision:revision})).data.data
}
export async function reviewPayment(payment:Payment,action:'confirm'|'reject',data:{confirmed_received:boolean}|{reject_reason:string}) {
  return (await http.post<{data:Payment}>(`/payments/${payment.id}/${action}`,{...data,expected_revision:payment.revision,...(action==='confirm'?{expected_amount:payment.amount}:{})})).data.data
}
export async function getPaymentProof(id:number,signal?:AbortSignal):Promise<Blob> {
  return (await http.get<Blob>(`/payments/${id}/proof`,{responseType:'blob',signal})).data
}
