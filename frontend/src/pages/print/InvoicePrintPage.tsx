import { InvoicePrint } from '@/features/invoices/InvoicePrint'

export function InvoicePrintPage({ admin = false }: { admin?: boolean }) {
  return <InvoicePrint admin={admin} />
}
