import { useParams } from 'react-router'
import { PrintField, PrintNotice, PrintSheet } from '@/components/ui/PrintSheet'
import { useAuth } from '@/features/auth/useAuth'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime, formatVND } from '@/lib/format'
import { getPayment } from './api'
import { paymentMethodLabels } from './types'

/** Biên nhận chỉ in được cho thanh toán đã xác nhận và đã có số RCP do Backend sinh. */
export function ReceiptPrint({ admin = false }: { admin?: boolean }) {
  const { paymentId: id = '' } = useParams()
  const { refresh } = useAuth()
  const validId = /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id))
  const { data, error, reload } = useApiResource(validId ? `payment:${id}` : null, signal => getPayment(id, signal), refresh)
  const printable = !!data && data.status === 'confirmed' && !!data.receipt_number
  const area = admin ? '/admin' : '/resident'
  return <PrintSheet title="Biên nhận thanh toán" code={data?.receipt_number} backTo={data ? `${area}/invoices/${data.invoice_id}` : admin ? '/admin/payments' : '/resident/invoices'} backLabel="Chi tiết hóa đơn" ready={printable}>
    {!validId ? <PrintNotice>Mã thanh toán không hợp lệ.</PrintNotice>
      : error ? <PrintNotice onRetry={reload}>{error}</PrintNotice>
      : !data ? <PrintNotice>Đang tải thanh toán…</PrintNotice>
      : !printable ? <PrintNotice>Chỉ thanh toán đã được xác nhận mới có biên nhận. Khoản chờ đối soát hoặc bị từ chối không in.</PrintNotice>
      : <>
        <dl className="grid grid-cols-2 gap-4">
          <PrintField label="Số biên nhận">{data.receipt_number}</PrintField>
          <PrintField label="Thời điểm xác nhận">{data.reviewed_at ? formatDateTime(data.reviewed_at) : '—'}</PrintField>
          <PrintField label="Đã nhận của">{data.invoice.tenant_name}</PrintField>
          <PrintField label="Phòng">{data.invoice.room_code} · {data.invoice.building_name}</PrintField>
          <PrintField label="Cho hóa đơn">{data.invoice.invoice_number ?? `#${data.invoice_id}`}</PrintField>
          <PrintField label="Hình thức">{paymentMethodLabels[data.method]}</PrintField>
        </dl>
        <p className="rounded-lg border-2 border-slate-800 p-4 text-center text-lg">Số tiền: <strong className="font-mono text-2xl">{formatVND(data.amount)}</strong></p>
        {data.method === 'deposit' && <p className="text-xs text-slate-600">Khoản này khấu trừ từ tiền cọc khi thanh lý, không phải tiền thu mới.</p>}
        <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs text-slate-600">
          <div><p className="font-bold">Người nộp tiền</p><p className="mt-16">(Ký, ghi rõ họ tên)</p></div>
          <div><p className="font-bold">Người xác nhận</p><p className="mt-16">(Ký, ghi rõ họ tên)</p></div>
        </div>
      </>}
  </PrintSheet>
}
