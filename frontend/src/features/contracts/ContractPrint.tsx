import { useParams } from 'react-router'
import { PrintField, PrintNotice, PrintSheet } from '@/components/ui/PrintSheet'
import { useAuth } from '@/features/auth/useAuth'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDate, formatServicePeriod, formatVND } from '@/lib/format'
import { getContract } from './api'
import { contractStatusLabels, depositStatusLabels } from './types'
import type { Contract } from './types'

const billingLabels: Record<string, string> = { metered: 'Theo chỉ số', per_room: 'Theo phòng', per_person: 'Theo người', per_unit: 'Theo đơn vị' }

function feeTerm(contract: Contract) {
  if (contract.early_termination_fee_type === 'none') return 'Không thỏa thuận phí chấm dứt trước hạn.'
  if (contract.early_termination_fee_type === 'fixed' && contract.early_termination_fee_amount !== null) return `Phí trước hạn cố định: ${formatVND(contract.early_termination_fee_amount)}.`
  if (contract.early_termination_fee_type === 'rent_multiple' && contract.early_termination_fee_multiplier !== null) return `Phí trước hạn: ${contract.early_termination_fee_multiplier} lần tiền thuê tháng.`
  return 'Chưa có dữ liệu điều khoản phí.'
}

/** Phiếu tóm tắt thông tin hợp đồng đã lưu (Admin); không phải mẫu văn bản hợp đồng pháp lý. */
export function ContractPrint() {
  const { contractId: id = '' } = useParams()
  const { refresh } = useAuth()
  const validId = /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id))
  const { data, error, reload } = useApiResource(validId ? `contract:${id}` : null, signal => getContract(id, signal), refresh)
  const printable = !!data && data.status !== 'draft'
  return <PrintSheet title="Phiếu thông tin hợp đồng" code={data?.contract_number} backTo={`/admin/contracts/${validId ? id : ''}`} backLabel="Chi tiết hợp đồng" ready={printable}>
    {!validId ? <PrintNotice>Mã hợp đồng không hợp lệ.</PrintNotice>
      : error ? <PrintNotice onRetry={reload}>{error}</PrintNotice>
      : !data ? <PrintNotice>Đang tải hợp đồng…</PrintNotice>
      : !printable ? <PrintNotice>Hợp đồng nháp chưa kích hoạt nên không có bản in.</PrintNotice>
      : <>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <PrintField label="Trạng thái">{contractStatusLabels[data.status]}</PrintField>
          <PrintField label="Người thuê đại diện">{data.tenant.full_name}</PrintField>
          <PrintField label="Liên hệ">{data.tenant.phone}{data.tenant.email ? ` · ${data.tenant.email}` : ''}</PrintField>
          <PrintField label="Phòng">{data.room.code} · {data.room.building.name}</PrintField>
          <PrintField label="Thời hạn">{formatDate(data.start_date)} – {formatDate(data.end_date)} (ngày cuối được ở)</PrintField>
          <PrintField label="Ngày bàn giao thực tế">{data.actual_end_date ? formatDate(data.actual_end_date) : 'Chưa bàn giao'}</PrintField>
          <PrintField label="Tiền thuê / tháng">{formatVND(data.monthly_rent)}</PrintField>
          <PrintField label="Tiền cọc">{formatVND(data.deposit_amount)} · {depositStatusLabels[data.deposit_status] ?? data.deposit_status}</PrintField>
          <PrintField label="Số người ở">{data.occupant_count}</PrintField>
          <PrintField label="Chỉ số điện đầu">{data.initial_electricity_reading ?? '—'}</PrintField>
          <PrintField label="Chỉ số nước đầu">{data.initial_water_reading ?? '—'}</PrintField>
          {data.inspection_result && <PrintField label="Kiểm tra phòng khi bàn giao">{data.inspection_result === 'no_damage' ? 'Không hư hỏng' : 'Có hư hỏng'}</PrintField>}
        </dl>
        {!!data.contract_services?.length && <section className="space-y-2"><h2 className="font-bold">Dịch vụ đăng ký</h2>
          <div className="overflow-x-auto print:overflow-visible"><table className="w-full border-collapse text-left text-sm"><thead><tr className="border-y border-slate-400 bg-slate-100 text-xs">{['Dịch vụ', 'Cách tính', 'Số lượng', 'Đơn giá', 'Hiệu lực'].map(label => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead>
            <tbody>{data.contract_services.map(line => <tr key={line.id} className="break-inside-avoid border-b border-slate-200">
              <td className="px-2 py-2 font-semibold">{line.service.name}</td>
              <td className="px-2 py-2">{billingLabels[line.service.billing_type] ?? line.service.billing_type}</td>
              <td className="px-2 py-2">{line.service.billing_type === 'metered' ? 'Theo số đo' : [line.quantity, line.service.unit].filter(Boolean).join(' ')}</td>
              <td className="whitespace-nowrap px-2 py-2">{line.unit_price === null ? (line.service.billing_type === 'metered' ? 'Theo bảng giá điện nước' : '—') : formatVND(line.unit_price)}</td>
              <td className="min-w-[7rem] px-2 py-2">{formatServicePeriod(line.start_date, line.end_date)}</td>
            </tr>)}</tbody></table></div></section>}
        <section className="space-y-2"><h2 className="font-bold">Điều khoản chấm dứt trước hạn đã lưu</h2><p>{feeTerm(data)}</p>
          {data.early_termination_waiver_conditions?.length ? <ul className="list-disc space-y-1 pl-5">{data.early_termination_waiver_conditions.map(condition => <li key={condition.code} className="whitespace-pre-wrap break-words">{condition.description}</li>)}</ul> : <p className="text-slate-500">Không có điều kiện miễn phí được lưu.</p>}</section>
        {data.inspection_note && <p className="whitespace-pre-wrap break-words"><strong>Ghi chú kiểm tra:</strong> {data.inspection_note}</p>}
        <p className="text-xs text-slate-500">Phiếu tóm tắt thông tin đã lưu trên hệ thống, không thay thế văn bản hợp đồng đã ký.</p>
      </>}
  </PrintSheet>
}
