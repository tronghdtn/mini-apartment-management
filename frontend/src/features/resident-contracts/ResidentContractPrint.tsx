import { useParams } from 'react-router'
import { PrintField, PrintNotice, PrintSheet } from '@/components/ui/PrintSheet'
import { useAuth } from '@/features/auth/useAuth'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDate, formatVND } from '@/lib/format'
import { getResidentContract } from './api'
import { depositStatusLabels, residentContractStatusLabels } from './types'
import type { ResidentContractDetail } from './types'

const billingLabels: Record<string, string> = { metered: 'Theo chỉ số', per_room: 'Theo phòng', per_person: 'Theo người', per_unit: 'Theo đơn vị' }
const closureLabels: Record<string, string> = { same_day: 'Nhận và trả cùng ngày', early_termination: 'Bàn giao trước hạn', on_time: 'Bàn giao đúng hạn', overdue_return: 'Bàn giao quá hạn' }

function feeTerm(item: ResidentContractDetail) {
  if (item.early_termination_fee_type === 'none') return 'Không thỏa thuận phí chấm dứt trước hạn.'
  if (item.early_termination_fee_type === 'fixed' && item.early_termination_fee_amount !== null) return `Phí trước hạn cố định: ${formatVND(item.early_termination_fee_amount)}.`
  if (item.early_termination_fee_type === 'rent_multiple' && item.early_termination_fee_multiplier !== null) return `Phí trước hạn: ${item.early_termination_fee_multiplier} lần tiền thuê tháng.`
  return 'Chưa có dữ liệu điều khoản phí.'
}

/** Phiếu tóm tắt hợp đồng của chính cư dân từ API chỉ đọc; không gồm CCCD hay liên hệ người ở cùng. */
export function ResidentContractPrint() {
  const { contractId: id = '' } = useParams()
  const { refresh } = useAuth()
  const validId = /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id))
  const { data: item, error, reload } = useApiResource(validId ? `resident-contract:${id}` : null, signal => getResidentContract(id, signal), refresh)
  return <PrintSheet title="Phiếu thông tin hợp đồng" code={item?.contract_number} backTo={`/resident/contracts/${validId ? id : ''}`} backLabel="Chi tiết hợp đồng" ready={!!item}>
    {!validId ? <PrintNotice>Mã hợp đồng không hợp lệ.</PrintNotice>
      : error ? <PrintNotice onRetry={reload}>{error}</PrintNotice>
      : !item ? <PrintNotice>Đang tải hợp đồng…</PrintNotice>
      : <>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <PrintField label="Trạng thái">{residentContractStatusLabels[item.status]}</PrintField>
          <PrintField label="Phòng">{item.room.code} · {item.room.building_name}</PrintField>
          <PrintField label="Địa chỉ">{item.room.address}</PrintField>
          <PrintField label="Thời hạn">{formatDate(item.start_date)} – {formatDate(item.end_date)} (ngày cuối được ở)</PrintField>
          <PrintField label="Bàn giao">{item.actual_end_date ? `Thực tế ${formatDate(item.actual_end_date)}` : `Dự kiến ${formatDate(item.planned_handover_date)}`}</PrintField>
          {item.closure_reason && <PrintField label="Lý do thanh lý">{closureLabels[item.closure_reason] ?? item.closure_reason}</PrintField>}
          <PrintField label="Tiền thuê / tháng">{formatVND(item.monthly_rent)}</PrintField>
          <PrintField label="Tiền cọc">{formatVND(item.deposit_amount)} · {depositStatusLabels[item.deposit_status]}</PrintField>
          <PrintField label="Số người ở">{item.occupant_count}</PrintField>
          <PrintField label="Chỉ số điện đầu">{item.initial_electricity_reading ?? '—'}</PrintField>
          <PrintField label="Chỉ số nước đầu">{item.initial_water_reading ?? '—'}</PrintField>
          {item.deposit_settled_at && <PrintField label="Đối soát cọc">Khấu trừ {formatVND(item.deposit_deducted_amount)} · Hoàn {formatVND(item.deposit_refund_amount)}</PrintField>}
        </dl>
        {!!item.occupants.length && <section className="space-y-1"><h2 className="font-bold">Người ở cùng</h2>{item.occupants.map((occupant, index) => <p key={index}>{occupant.full_name}{occupant.relationship ? ` (${occupant.relationship})` : ''}</p>)}</section>}
        {!!item.contract_services.length && <section className="space-y-2"><h2 className="font-bold">Dịch vụ đăng ký</h2>
          <table className="w-full border-collapse text-left text-sm"><thead><tr className="border-y border-slate-400 bg-slate-100 text-xs">{['Dịch vụ', 'Cách tính', 'Số lượng', 'Đơn giá', 'Hiệu lực'].map(label => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead>
            <tbody>{item.contract_services.map(line => <tr key={line.id} className="break-inside-avoid border-b border-slate-200">
              <td className="px-2 py-2 font-semibold">{line.name}</td>
              <td className="px-2 py-2">{billingLabels[line.billing_type] ?? line.billing_type}</td>
              <td className="px-2 py-2">{line.billing_type === 'metered' ? 'Theo số đo' : [line.quantity, line.unit].filter(Boolean).join(' ')}</td>
              <td className="whitespace-nowrap px-2 py-2">{line.unit_price === null ? (line.billing_type === 'metered' ? 'Theo bảng giá điện nước' : '—') : formatVND(line.unit_price)}</td>
              <td className="whitespace-nowrap px-2 py-2">{formatDate(line.start_date)} – {line.end_date ? formatDate(line.end_date) : 'Chưa kết thúc'}</td>
            </tr>)}</tbody></table></section>}
        <section className="space-y-2"><h2 className="font-bold">Điều khoản chấm dứt trước hạn đã lưu</h2><p>{feeTerm(item)}</p>
          {item.early_termination_waiver_conditions.length ? <ul className="list-disc space-y-1 pl-5">{item.early_termination_waiver_conditions.map(condition => <li key={condition.code} className="whitespace-pre-wrap break-words">{condition.description}</li>)}</ul> : <p className="text-slate-500">Không có điều kiện miễn phí được lưu.</p>}</section>
        {item.inspection_result && <p><strong>Kiểm tra phòng khi bàn giao:</strong> {item.inspection_result === 'no_damage' ? 'Không hư hỏng' : 'Có hư hỏng'}{item.inspection_note ? ` — ${item.inspection_note}` : ''}</p>}
        <p className="text-xs text-slate-500">Phiếu tóm tắt thông tin đã lưu trên hệ thống, không thay thế văn bản hợp đồng đã ký.</p>
      </>}
  </PrintSheet>
}
