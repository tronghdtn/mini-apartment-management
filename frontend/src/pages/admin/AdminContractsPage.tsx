import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AlertTriangle, FileText, Plus, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { businessToday, formatVND, formatDate } from '@/lib/format'
import { getContracts } from '@/features/contracts/api'
import { contractFiltersSchema } from '@/features/contracts/schemas'
import type { ContractFilters } from '@/features/contracts/schemas'
import { contractLabel, contractStatusLabels, contractStatusTones, depositStatusText, depositStatusTone, isPastLastDay } from '@/features/contracts/types'
import type { Contract, ContractPage } from '@/features/contracts/types'

type StatusTab = '' | 'draft' | 'active' | 'terminated'
const statusTabs: { id: StatusTab; label: string }[] = [
  { id: '', label: 'Tất cả' }, { id: 'draft', label: 'Bản nháp' }, { id: 'active', label: 'Đang hiệu lực' }, { id: 'terminated', label: 'Đã thanh lý' },
]
const filterKeys = ['status', 'building_id', 'room_id', 'user_id', 'q'] as const

function OverdueNote() {
  return <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Đã qua ngày cuối được ở, chưa bàn giao</span>
}

function ContractCard({ contract, today }: { contract: Contract; today: string }) {
  return <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><Link to={`/admin/contracts/${contract.id}`} className="font-mono text-sm font-bold text-slate-900 hover:text-sky-600">{contractLabel(contract)}</Link>
        <p className="mt-1 text-sm font-semibold text-slate-800">Phòng {contract.room.code} <span className="font-normal text-slate-500">· {contract.room.building.name}</span></p></div>
      <Badge tone={contractStatusTones[contract.status]} dot>{contractStatusLabels[contract.status]}</Badge>
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
      <div className="col-span-2"><dt className="text-slate-500">Người thuê</dt><dd className="font-semibold text-slate-800 break-words">{contract.tenant.full_name} · {contract.tenant.phone}</dd></div>
      <div className="col-span-2"><dt className="text-slate-500">Thời hạn (ngày cuối ở)</dt><dd className="text-slate-800">{formatDate(contract.start_date)} → <strong>{formatDate(contract.end_date)}</strong></dd>{isPastLastDay(contract, today) && <OverdueNote />}</div>
      <div><dt className="text-slate-500">Tiền thuê</dt><dd className="font-bold text-sky-700">{formatVND(contract.monthly_rent)}/tháng</dd></div>
      <div><dt className="text-slate-500">Tiền cọc</dt><dd><Badge size="sm" tone={depositStatusTone(contract.deposit_status)}>{depositStatusText(contract)}</Badge></dd></div>
    </dl>
    <Link to={`/admin/contracts/${contract.id}`} className="mt-4 block rounded-xl border border-slate-300 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Xem chi tiết</Link>
  </li>
}

export function AdminContractsPage() {
  const [params, setParams] = useSearchParams()
  const urlFilters = Object.fromEntries(filterKeys.map(field => [field, params.get(field) ?? ''])) as ContractFilters
  const parsed = contractFiltersSchema.safeParse(urlFilters)
  const filters = parsed.success ? parsed.data : null
  const rawPage = params.get('page') ?? '1'
  const page = /^[1-9]\d{0,8}$/.test(rawPage) ? Number(rawPage) : 1
  const [retry, setRetry] = useState(0)
  const filtersJson = filters ? JSON.stringify(filters) : ''
  const key = `${filtersJson}:${page}:${retry}`
  const [result, setResult] = useState<{ key: string; data?: ContractPage; error?: string }>()
  const { register, handleSubmit, reset, setValue, setError: setFieldError, formState: { errors } } = useForm<ContractFilters>({ resolver: zodResolver(contractFiltersSchema), defaultValues: filters ?? urlFilters })
  const queryText = filters?.q ?? ''
  useEffect(() => { setValue('q', queryText) }, [queryText, setValue])
  useEffect(() => {
    if (!filtersJson) return
    const requestKey = `${filtersJson}:${page}:${retry}`
    const controller = new AbortController()
    getContracts(page, JSON.parse(filtersJson) as ContractFilters, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key: requestKey, data }) })
      .catch(failure => { if (!controller.signal.aborted) { setResult({ key: requestKey, error: apiErrorMessage(failure) }); applyApiErrors(failure, setFieldError, ['q', 'status']) } })
    return () => controller.abort()
  }, [filtersJson, page, retry, setFieldError])
  const current = result?.key === key ? result : undefined
  const today = businessToday()
  const status = (filters?.status ?? '') as StatusTab
  const hasFilters = !!filters && filterKeys.some(field => filters[field] !== '')
  function navigate(next: Partial<ContractFilters>, nextPage = 1) {
    const merged = { ...(filters ?? urlFilters), ...next }
    const search = new URLSearchParams()
    for (const field of filterKeys) if (merged[field]) search.set(field, merged[field])
    if (nextPage > 1) search.set('page', String(nextPage))
    setParams(search)
  }
  function clearFilters() { reset({ status: '', building_id: '', room_id: '', user_id: '', q: '' }); setParams(new URLSearchParams()) }

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div><h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Quản Lý Hợp Đồng Thuê</h1><p className="text-xs text-slate-500 mt-1">Bản nháp được sửa, nhận cọc và kích hoạt tại trang chi tiết; hợp đồng hiệu lực chỉ đọc cho đến khi bàn giao và thanh lý.</p></div>
      <Link to="/admin/contracts/new" className="self-start sm:self-auto"><Button icon={<Plus className="w-4 h-4" />}>Lập hợp đồng mới</Button></Link>
    </div>
    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs size="sm" tabs={statusTabs} activeTab={status} onChange={value => navigate({ status: value })} />
        <form noValidate role="search" onSubmit={event => { void handleSubmit(input => navigate({ q: input.q }))(event) }} className="flex w-full lg:w-auto gap-2 items-start">
          <div className="flex-1 lg:w-72"><label htmlFor="contract-q" className="sr-only">Tìm hợp đồng</label><div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input id="contract-q" type="search" {...register('q')} placeholder="Mã hợp đồng, người thuê, phòng…" aria-invalid={!!errors.q} aria-describedby="contract-q-error" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm" /></div>{errors.q && <p id="contract-q-error" role="alert" className="text-xs text-rose-600 mt-1">{errors.q.message}</p>}</div>
          <Button type="submit">Tìm</Button>
        </form>
      </div>
      {(hasFilters || !filters) && <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">{(filters?.building_id || filters?.room_id || filters?.user_id) && <span className="rounded-full bg-slate-100 px-3 py-1">Đang lọc theo {[filters.building_id && 'tòa', filters.room_id && 'phòng', filters.user_id && 'người thuê'].filter(Boolean).join(', ')} từ liên kết</span>}<button type="button" onClick={clearFilters} className="font-semibold text-sky-700 underline">Xóa bộ lọc</button></div>}
    </div>
    {!filters ? <div role="alert" className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">Bộ lọc trên địa chỉ trang không hợp lệ. Hãy xóa bộ lọc để xem danh sách.</div>
      : !current ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải danh sách hợp đồng…</p>
      : current.error ? <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3"><p className="text-sm text-rose-700">{current.error}</p><div className="flex gap-3 items-center"><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử lại</Button><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div></div>
      : current.data && (current.data.data.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3"><FileText className="mx-auto h-10 w-10 text-slate-300" /><p className="font-semibold text-slate-700">{hasFilters ? 'Không có hợp đồng phù hợp bộ lọc.' : 'Chưa có hợp đồng nào.'}</p>{hasFilters ? <Button variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button> : <Link to="/admin/contracts/new" className="inline-block text-sm font-semibold text-sky-700 underline">Lập hợp đồng đầu tiên</Link>}</div> : <>
        <ul className="space-y-3 md:hidden" aria-label="Danh sách hợp đồng">{current.data.data.map(contract => <ContractCard key={contract.id} contract={contract} today={today} />)}</ul>
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs"><table className="w-full min-w-[880px] text-left text-xs"><thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase"><tr><th className="px-5 py-3.5">Mã hợp đồng</th><th className="px-5 py-3.5">Phòng / Tòa nhà</th><th className="px-5 py-3.5">Người đại diện thuê</th><th className="px-5 py-3.5">Thời hạn (ngày cuối ở)</th><th className="px-5 py-3.5">Tiền thuê</th><th className="px-5 py-3.5">Trạng thái cọc</th><th className="px-5 py-3.5">Trạng thái</th><th className="px-5 py-3.5 text-right">Chi tiết</th></tr></thead><tbody className="divide-y divide-slate-100 text-slate-700">
          {current.data.data.map(contract => <tr key={contract.id} className="hover:bg-slate-50/80"><td className="px-5 py-4 font-mono font-bold text-slate-900"><Link to={`/admin/contracts/${contract.id}`} className="hover:text-sky-600">{contractLabel(contract)}</Link></td><td className="px-5 py-4"><span className="font-bold text-sm text-slate-800 block">{contract.room.code}</span><span className="text-slate-500">{contract.room.building.name}</span></td><td className="px-5 py-4"><span className="font-semibold text-sm text-slate-900 block">{contract.tenant.full_name}</span><span className="text-slate-500">{contract.tenant.phone}</span></td><td className="px-5 py-4 text-sm"><span className="whitespace-nowrap">{formatDate(contract.start_date)} → <strong>{formatDate(contract.end_date)}</strong></span>{isPastLastDay(contract, today) && <OverdueNote />}</td><td className="px-5 py-4 font-bold text-sky-700 whitespace-nowrap">{formatVND(contract.monthly_rent)}/tháng</td><td className="px-5 py-4"><Badge tone={depositStatusTone(contract.deposit_status)}>{depositStatusText(contract)}</Badge></td><td className="px-5 py-4"><Badge tone={contractStatusTones[contract.status]} dot>{contractStatusLabels[contract.status]}</Badge></td><td className="px-5 py-4 text-right"><Link to={`/admin/contracts/${contract.id}`} className="inline-block px-3 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Chi tiết</Link></td></tr>)}
        </tbody></table></div>
        <nav aria-label="Phân trang hợp đồng" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><p>Trang {current.data.meta.current_page}/{current.data.meta.last_page} · {current.data.meta.total} hợp đồng</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => navigate({}, page - 1)}>Trang trước</Button><Button variant="outline" size="sm" disabled={page >= current.data.meta.last_page} onClick={() => navigate({}, page + 1)}>Trang sau</Button></div></nav>
      </>)}
  </div>
}
