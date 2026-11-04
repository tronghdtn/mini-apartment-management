import { useParams } from 'react-router'
import { PrintField, PrintNotice, PrintSheet } from '@/components/ui/PrintSheet'
import { useAuth } from '@/features/auth/useAuth'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'
import { getInvoice } from './api'
import { invoiceStatusLabels } from './types'

const typeLabels = { monthly: 'Hóa đơn tháng', final: 'Hóa đơn tất toán', adjustment: 'Hóa đơn điều chỉnh' } as const
const period = (value: string) => `${value.slice(5, 7)}/${value.slice(0, 4)}`

/** Bản in hóa đơn đã phát hành; mọi số tiền lấy nguyên từ API, nháp không được in. */
export function InvoicePrint({ admin = false }: { admin?: boolean }) {
  const { invoiceId: id = '' } = useParams()
  const { refresh } = useAuth()
  const validId = /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id))
  const { data, error, reload } = useApiResource(validId ? `invoice:${id}` : null, signal => getInvoice(id, signal), refresh)
  const printable = !!data && data.status !== 'draft'
  return <PrintSheet title="Hóa đơn" code={data?.invoice_number} backTo={`${admin ? '/admin' : '/resident'}/invoices/${validId ? id : ''}`} backLabel="Chi tiết hóa đơn" ready={printable}>
    {!validId ? <PrintNotice>Mã hóa đơn không hợp lệ.</PrintNotice>
      : error ? <PrintNotice onRetry={reload}>{error}</PrintNotice>
      : !data ? <PrintNotice>Đang tải hóa đơn…</PrintNotice>
      : !printable ? <PrintNotice>Hóa đơn nháp chưa phát hành nên không có bản in.</PrintNotice>
      : <>
        {data.status === 'cancelled' && <p className="rounded-lg border-2 border-rose-600 p-3 text-center font-extrabold uppercase text-rose-700">Đã hủy — không còn giá trị thanh toán{data.cancel_reason ? `. Lý do: ${data.cancel_reason}` : ''}{data.replacement_invoice_id ? `. Thay bằng hóa đơn #${data.replacement_invoice_id}` : ''}</p>}
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <PrintField label="Người thuê">{data.tenant_name}</PrintField>
          <PrintField label="Phòng">{data.room.code} · {data.room.building_name}</PrintField>
          <PrintField label="Hợp đồng">{data.contract_number ?? `#${data.contract_id}`}</PrintField>
          <PrintField label="Loại">{typeLabels[data.type]}</PrintField>
          <PrintField label="Kỳ hóa đơn">{period(data.period)}</PrintField>
          <PrintField label="Trạng thái">{data.is_overdue ? 'Quá hạn' : invoiceStatusLabels[data.status]}</PrintField>
          <PrintField label="Ngày phát hành">{data.issued_at ? formatDateTime(data.issued_at) : '—'}</PrintField>
          <PrintField label="Hạn thanh toán">{data.due_date ? formatDate(data.due_date) : '—'}</PrintField>
        </dl>
        <div className="overflow-x-auto print:overflow-visible"><table className="w-full border-collapse text-left text-sm">
          <thead><tr className="border-y border-slate-400 bg-slate-100 text-xs">{['#', 'Khoản thu', 'Số lượng', 'Đơn giá', 'Thành tiền'].map(label => <th key={label} className={`px-2 py-2 ${['Số lượng', 'Đơn giá', 'Thành tiền'].includes(label) ? 'text-right' : ''}`}>{label}</th>)}</tr></thead>
          <tbody>{data.items?.map((item, index) => <tr key={item.id} className="break-inside-avoid border-b border-slate-200 align-top">
            <td className="px-2 py-2">{index + 1}</td>
            <td className="px-2 py-2"><p className="font-semibold">{item.description}</p>
              {item.calculation?.active_days !== undefined && <p className="text-xs text-slate-500">{item.calculation.active_days}/{item.calculation.days_in_month} ngày của kỳ {period(item.calculation.period ?? data.period)}</p>}
              {item.basis && <p className="whitespace-pre-wrap break-words text-xs text-slate-500">Căn cứ: {item.basis}</p>}</td>
            <td className="px-2 py-2 text-right font-mono">{item.quantity}</td>
            <td className="whitespace-nowrap px-2 py-2 text-right">{formatVND(item.unit_price)}</td>
            <td className="whitespace-nowrap px-2 py-2 text-right font-semibold">{formatVND(item.amount)}</td>
          </tr>)}</tbody>
        </table></div>
        {!!data.meter_readings?.length && <section className="space-y-1"><h2 className="font-bold">{data.type === 'final' ? 'Mốc điện nước đưa vào tất toán' : 'Chỉ số điện nước kỳ tiêu thụ trước'}</h2>
          {data.meter_readings.map(reading => <p key={reading.id} className="text-xs text-slate-600">{reading.service} kỳ {period(reading.period)}: {reading.previous_reading} → {reading.current_reading} = {reading.consumption} × {formatVND(reading.unit_price)} = {formatVND(reading.amount)}</p>)}</section>}
        <dl className="ml-auto w-full max-w-xs space-y-1 border-t-2 border-slate-800 pt-3">
          <div className="flex justify-between gap-4"><dt>Tổng hóa đơn</dt><dd className="font-bold">{formatVND(data.total_amount)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Đã thanh toán (đã xác nhận)</dt><dd>{formatVND(data.paid_amount)}</dd></div>
          <div className="flex justify-between gap-4 text-base"><dt className="font-bold">Còn phải trả</dt><dd className="font-extrabold">{formatVND(data.outstanding_amount)}</dd></div>
        </dl>
        <p className="text-xs text-slate-500">Khoản chờ xác nhận chưa được trừ vào công nợ. Số liệu theo hệ thống tại thời điểm in.</p>
      </>}
  </PrintSheet>
}
