import { InvoiceDetail } from '@/features/invoices/InvoiceDetail'
import { InvoicePayments } from '@/features/payments/InvoicePayments'
export function ResidentInvoiceDetailPage() { return <InvoiceDetail renderPayments={(invoice,onChanged)=><InvoicePayments key={invoice.id} invoiceId={invoice.id} status={invoice.status} outstanding={invoice.outstanding_amount} onChanged={onChanged}/>} /> }
