import { InvoiceDetail } from '@/features/invoices/InvoiceDetail'
import { InvoicePayments } from '@/features/payments/InvoicePayments'
export function AdminInvoiceDetailPage() { return <InvoiceDetail admin renderPayments={(invoice,onChanged)=><InvoicePayments key={invoice.id} admin invoiceId={invoice.id} status={invoice.status} outstanding={invoice.outstanding_amount} revision={invoice.revision} onChanged={onChanged}/>} /> }
