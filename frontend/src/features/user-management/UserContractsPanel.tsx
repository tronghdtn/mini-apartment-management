import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate, formatVND } from '@/lib/format'
import { getUserContracts } from './api'
import { userContractsQuerySchema, userContractStatusLabels, type UserContractsPage } from './contractHistory'

export function UserContractsPanel({ userId }: { userId: number }) {
  const [params, setParams] = useSearchParams()
  const page = params.get('contracts_page') ?? '1'
  const [retry, setRetry] = useState(0)
  const key = `${userId}:${page}:${retry}`
  const valid = userContractsQuerySchema.safeParse({ user_id: userId, page }).success
  const [result, setResult] = useState<{ key: string; data?: UserContractsPage; error?: string }>()
  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    getUserContracts(userId, page, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }) })
      .catch(failure => { if (!controller.signal.aborted) setResult({ key, error: apiErrorMessage(failure) }) })
    return () => controller.abort()
  }, [userId, page, key, valid])
  function changePage(next: number) {
    const updated = new URLSearchParams(params)
    if (next === 1) updated.delete('contracts_page'); else updated.set('contracts_page', String(next))
    setParams(updated)
  }
  const current = result?.key === key ? result : undefined
  const data = current?.data
  return <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold text-slate-900">Lịch sử hợp đồng</h2><Link to={`/admin/contracts?user_id=${userId}`} className="text-sm text-sky-700 hover:underline">Mở danh sách đầy đủ</Link></div>
    {!valid ? <div role="alert" className="space-y-2 text-sm text-rose-700"><p>Trang hợp đồng trên URL không hợp lệ.</p><Button variant="outline" onClick={() => changePage(1)}>Về trang đầu</Button></div>
      : current?.error ? <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{current.error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử lại lịch sử hợp đồng</Button></div>
      : !data ? <p role="status" className="text-sm text-slate-500">Đang tải lịch sử hợp đồng…</p>
      : <>
        <p className="text-sm text-slate-500">{data.meta.total} hợp đồng trong danh sách hiện hành. Mở chi tiết để xem hóa đơn và dịch vụ liên quan.</p>
        {data.data.length === 0 ? <p className="text-sm text-slate-500">Không có hợp đồng ở trang này.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm text-left">
          <thead className="text-xs text-slate-500"><tr>{['Hợp đồng', 'Phòng / Tòa nhà', 'Thời hạn', 'Tiền thuê / tháng', 'Trạng thái'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
          <tbody>{data.data.map(contract => <tr key={contract.id} className="border-t border-slate-100">
            <td className="p-3"><Link to={`/admin/contracts/${contract.id}`} className="font-semibold text-sky-700 hover:underline">{contract.contract_number ?? `#${contract.id}`}</Link></td>
            <td className="p-3"><Link to={`/admin/rooms/${contract.room.id}`} className="text-sky-700 hover:underline">{contract.room.code}</Link><p className="text-xs text-slate-500">{contract.room.building.name}</p></td>
            <td className="p-3 whitespace-nowrap">{formatDate(contract.start_date)} → {formatDate(contract.end_date)}</td>
            <td className="p-3 text-right whitespace-nowrap">{formatVND(contract.monthly_rent)}</td>
            <td className="p-3"><Badge tone={contract.status === 'active' ? 'emerald' : 'slate'}>{userContractStatusLabels[contract.status]}</Badge></td>
          </tr>)}</tbody></table></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>Trang {data.meta.current_page} / {data.meta.last_page}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={data.meta.current_page <= 1} onClick={() => changePage(data.meta.current_page - 1)}>Trước</Button><Button size="sm" variant="outline" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => changePage(data.meta.current_page + 1)}>Sau</Button></div></div>
      </>}
  </section>
}
