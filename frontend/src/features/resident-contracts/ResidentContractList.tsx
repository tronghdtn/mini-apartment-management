import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { isAxiosError } from 'axios'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate, formatVND } from '@/lib/format'
import { getResidentContracts } from './api'
import { residentContractFiltersSchema } from './schemas'
import { depositStatusLabels, residentContractStatusLabels } from './types'
import type { ResidentContractPage } from './types'

export function ResidentContractList() {
  const { refresh } = useAuth()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'all', page = params.get('page') ?? '1'
  const [retry, setRetry] = useState(0)
  const key = `${status}:${page}:${retry}`
  const valid = residentContractFiltersSchema.safeParse({ status, page }).success
  const [result, setResult] = useState<{ key: string; data?: ResidentContractPage; error?: string }>()
  useEffect(() => {
    if (!valid) return
    const abort = new AbortController()
    getResidentContracts({ status, page }, abort.signal).then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(failure => { if (!abort.signal.aborted) { setResult({ key, error: apiErrorMessage(failure) }); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() } })
    return () => abort.abort()
  }, [status, page, key, valid, refresh])
  const current = result?.key === key ? result : undefined
  function changePage(value: number) { const next = new URLSearchParams(params); next.set('page', String(value)); setParams(next) }
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Hồ sơ thuê / Hợp đồng</p><h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-slate-900"><FileText className="h-6 w-6 text-sky-600" />Hợp đồng thuê phòng của tôi</h1><p className="mt-2 text-sm text-slate-500">Theo dõi thời hạn thuê, tiền cọc và điều khoản đã ký, gồm cả lịch sử sau thanh lý.</p></header>
    <div className="flex flex-wrap items-center justify-between gap-3"><nav aria-label="Lọc hợp đồng" className="flex max-w-full gap-2 overflow-x-auto border-b border-slate-200 pb-2">{(['all', 'active', 'terminated', 'expired'] as const).map(tab => <button key={tab} type="button" aria-current={status === tab ? 'page' : undefined} onClick={() => setParams(tab === 'all' ? {} : { status: tab })} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${status === tab ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{tab === 'all' ? 'Tất cả' : residentContractStatusLabels[tab]}</button>)}</nav><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Tải lại</Button></div>
    {!valid || current?.error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-white p-5"><p>{!valid ? 'Bộ lọc hợp đồng không hợp lệ.' : current?.error}</p><Button onClick={() => { setParams({}); setRetry(value => value + 1) }}>Thử lại</Button></div> : !current?.data ? <p role="status">Đang tải hợp đồng…</p> : <>
      {!current.data.data.length ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Không có hợp đồng phù hợp.</div> : <div className="space-y-4">{current.data.data.map(item => <article key={item.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3"><h2 className="font-mono font-bold text-slate-900">{item.contract_number ?? 'Chưa có mã hợp đồng'}</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>{residentContractStatusLabels[item.status]}</span></header><p className="font-bold text-slate-900">Phòng {item.room.code} · {item.room.building_name}</p><dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Thời hạn được ở</dt><dd className="mt-1 font-semibold">{formatDate(item.start_date)} – {formatDate(item.end_date)}</dd></div><div><dt className="text-slate-500">Tiền thuê / tháng</dt><dd className="mt-1 font-bold text-sky-700">{formatVND(item.monthly_rent)}</dd></div><div><dt className="text-slate-500">Tiền cọc · {depositStatusLabels[item.deposit_status]}</dt><dd className="mt-1 font-semibold">{formatVND(item.deposit_amount)}</dd></div></dl><Link to={`/resident/contracts/${item.id}`} className="inline-block text-sm font-bold text-sky-700 underline">Xem chi tiết hợp đồng</Link></article>)}</div>}
      <nav aria-label="Phân trang hợp đồng" className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>Trang {current.data.meta.current_page}/{current.data.meta.last_page} · {current.data.meta.total} hợp đồng</p><div className="flex gap-2"><Button variant="outline" disabled={Number(page) <= 1} onClick={() => changePage(Number(page) - 1)}>Trước</Button><Button variant="outline" disabled={Number(page) >= current.data.meta.last_page} onClick={() => changePage(Number(page) + 1)}>Sau</Button></div></nav>
    </>}
  </div>
}
