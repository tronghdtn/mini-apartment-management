import { Link } from 'react-router'
import { formatDate, formatVND } from '@/lib/format'
import type { MeterReading } from './types'

/** Cùng bảng dữ liệu cho trang quản lý chỉ số và tab lịch sử của phòng. */
export function MeterReadingsTable({ readings }: { readings: MeterReading[] }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table className="w-full whitespace-nowrap text-left text-sm">
      <thead className="bg-slate-50 text-xs text-slate-500"><tr>
        {['Phòng / Tòa', 'Kỳ / Ngày đo', 'Dịch vụ', 'Chỉ số trước → mới', 'Tiêu thụ', 'Đơn giá', 'Thành tiền', 'Ghi nhận'].map(title => <th key={title} className="px-4 py-3">{title}</th>)}
      </tr></thead>
      <tbody className="divide-y divide-slate-100">
        {!readings.length ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">Chưa có chỉ số trong phạm vi đã chọn.</td></tr> : readings.map(reading => <tr key={reading.id}>
          <td className="px-4 py-4"><Link className="font-bold text-sky-700" to={`/admin/rooms/${reading.room_id}`}>{reading.room.code}</Link><p className="text-xs text-slate-500">{reading.room.building_name}</p></td>
          <td className="px-4 py-4">{formatDate(reading.period)}<p className="text-xs text-slate-500">{formatDate(reading.reading_date)}</p></td>
          <td className="px-4 py-4">{reading.service.name}<p className="text-xs text-slate-500">{reading.service.unit}</p></td>
          <td className="px-4 py-4 font-mono">{reading.previous_reading} → {reading.current_reading}</td>
          <td className="px-4 py-4 font-mono">{reading.consumption}</td>
          <td className="px-4 py-4">{formatVND(reading.unit_price)}</td>
          <td className="px-4 py-4 font-bold text-sky-800">{formatVND(reading.amount)}</td>
          <td className="px-4 py-4 text-xs"><p>{reading.kind === 'periodic' ? 'Định kỳ' : 'Chốt thanh lý'}</p>
            {reading.contract_id ? <Link className="text-sky-700 underline" to={`/admin/contracts/${reading.contract_id}`}>Hợp đồng #{reading.contract_id}</Link> : <span>Phòng trống</span>}
            <p className="text-slate-500">{reading.invoice_id ? <Link className="text-sky-700 underline" to={`/admin/invoices/${reading.invoice_id}`}>Hóa đơn #{reading.invoice_id}</Link> : 'Chưa gắn hóa đơn'}</p>
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>
}
