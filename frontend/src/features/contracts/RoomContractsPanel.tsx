import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getContracts } from './api'
import { contractStatusLabels } from './types'
import type { ContractPage } from './types'

export function RoomContractsPanel({ roomId }: { roomId: number }) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ page: number; data: ContractPage } | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getContracts(page, { room_id: String(roomId), building_id: '', status: '', user_id: '', q: '' }, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setResult({ page, data }); setError('') } })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
    return () => controller.abort()
  }, [roomId, page, revision])
  if (error) return <div role="alert" className="rounded-2xl bg-rose-50 p-5 space-y-3 text-sm text-rose-800"><p>{error}</p><Button variant="outline" onClick={() => { setError(''); setResult(null); setRevision(value => value + 1) }}>Thử lại</Button></div>
  if (!result || result.page !== page) return <p role="status" className="p-6 text-sm text-slate-500">Đang tải lịch sử hợp đồng…</p>
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Hợp đồng của phòng</h2><p className="mt-1 text-xs text-slate-500">{result.data.meta.total} hợp đồng · Giá và cọc theo từng hợp đồng đã lưu.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Hợp đồng', 'Người đại diện', 'Thời hạn', 'Giá thuê / tháng', 'Trạng thái'].map(label => <th key={label} className="whitespace-nowrap px-5 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{result.data.data.map(contract => <tr key={contract.id}><td className="whitespace-nowrap px-5 py-4"><Link to={`/admin/contracts/${contract.id}`} className="font-semibold text-sky-700 hover:underline">{contract.contract_number || `Bản nháp #${contract.id}`}</Link></td><td className="px-5 py-4">{contract.tenant.full_name}</td><td className="whitespace-nowrap px-5 py-4">{contract.start_date.split('-').reverse().join('/')} – {contract.end_date.split('-').reverse().join('/')}</td><td className="whitespace-nowrap px-5 py-4 text-right">{formatVND(contract.monthly_rent)}</td><td className="px-5 py-4"><Badge tone={contract.status === 'active' ? 'emerald' : 'slate'}>{contractStatusLabels[contract.status]}</Badge></td></tr>)}{result.data.data.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Phòng chưa có hợp đồng.</td></tr>}</tbody></table></div>{result.data.meta.last_page > 1 && <div className="flex items-center justify-center gap-3 border-t border-slate-100 p-4 text-sm"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button><span>{page}/{result.data.meta.last_page}</span><Button variant="outline" size="sm" disabled={page >= result.data.meta.last_page} onClick={() => setPage(page + 1)}>Sau</Button></div>}</section>
}
