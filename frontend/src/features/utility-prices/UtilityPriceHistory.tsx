import { formatDate, formatVND } from '@/lib/format'
import type { UtilityPrice } from './types'

export function UtilityPriceHistory({ prices }: { prices: UtilityPrice[] }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table className="w-full min-w-160 text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr>{['Tòa nhà', 'Dịch vụ', 'Ngày hiệu lực', 'Đơn giá', 'Đơn vị'].map(label => <th key={label} scope="col" className="px-5 py-3">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{prices.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Chưa có mức giá trong phạm vi đã chọn.</td></tr> : prices.map(price => <tr key={price.id}><td className="px-5 py-4 font-semibold">{price.building.name}</td><td className="px-5 py-4">{price.service.name}</td><td className="whitespace-nowrap px-5 py-4">{formatDate(price.effective_from)}</td><td className="whitespace-nowrap px-5 py-4 font-bold text-sky-700">{formatVND(price.unit_price)}</td><td className="px-5 py-4">{price.service.unit ?? 'Chưa khai báo'}</td></tr>)}</tbody>
    </table>
  </div>
}
