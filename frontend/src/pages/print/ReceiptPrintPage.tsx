import { ReceiptPrint } from '@/features/payments/ReceiptPrint'

export function ReceiptPrintPage({ admin = false }: { admin?: boolean }) {
  return <ReceiptPrint admin={admin} />
}
