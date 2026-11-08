import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AlertTriangle, ChevronRight, Clock, FileText, Plus, RotateCcw, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'
import { useKeepPrevious } from '@/hooks/useKeepPrevious'
import { apiErrorMessage } from '@/lib/apiErrors'
import { businessToday, formatVND, formatDate } from '@/lib/format'
import { getContracts } from '@/features/contracts/api'
import { contractFiltersSchema } from '@/features/contracts/schemas'
import type { ContractFilters } from '@/features/contracts/schemas'
import { contractDueState, contractLabel, contractStatusLabels, contractStatusTones, depositStatusText, depositStatusTone } from '@/features/contracts/types'
import type { Contract, ContractDueWindow, ContractPage, ContractTabCounts } from '@/features/contracts/types'

type TabId = '' | 'draft' | 'active' | 'expiring' | 'overdue' | 'terminated'
const tabDefs: { id: TabId; label: string; count: keyof ContractTabCounts; filter: Pick<ContractFilters, 'status' | 'due'> }[] = [
  { id: '', label: 'Tất cả', count: 'all', filter: { status: '', due: '' } },
  { id: 'draft', label: 'Bản nháp', count: 'draft', filter: { status: 'draft', due: '' } },
  { id: 'active', label: 'Đang hiệu lực', count: 'active', filter: { status: 'active', due: '' } },
  { id: 'expiring', label: 'Sắp hết hạn', count: 'expiring', filter: { status: '', due: 'expiring' } },
  { id: 'overdue', label: 'Quá hạn trả phòng', count: 'overdue', filter: { status: '', due: 'overdue' } },
  { id: 'terminated', label: 'Đã thanh lý', count: 'terminated', filter: { status: 'terminated', due: '' } },
]
const filterKeys = ['status', 'due', 'building_id', 'room_id', 'user_id', 'q'] as const
const scopeKeys = ['building_id', 'room_id', 'user_id', 'q'] as const

function DueNote({ state }: { state: ReturnType<typeof contractDueState> }) {
  if (state === 'overdue') return <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700" title="Đã qua ngày cuối được ở nhưng chưa bàn giao phòng"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Quá hạn trả phòng</span>
  if (state === 'expiring') return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700"><Clock className="h-3.5 w-3.5 shrink-0" />Sắp hết hạn</span>
  return null
}

const dayMs = 86_400_000
function dateValue(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Thanh thời hạn: phần đã ở so với tổng thời hạn, chỉ cho hợp đồng đang hiệu lực. */
function TermBar({ contract, today, state }: { contract: Contract; today: string; state: ReturnType<typeof contractDueState> }) {
  if (contract.status !== 'active') return null
  const start = dateValue(contract.start_date)
  const total = dateValue(contract.end_date) - start + dayMs
  const used = Math.min(Math.max(dateValue(today) - start + dayMs, 0), total)
  const ratio = total > 0 ? Math.round((used / total) * 100) : 0
  const color = state === 'overdue' ? 'bg-rose-500' : state === 'expiring' ? 'bg-amber-500' : 'bg-sky-500'
  return (
    <div className="mt-2 h-1 w-full max-w-40 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Đã qua ${ratio}% thời hạn`}>
      <div className={`h-full ${color}`} style={{ width: `${ratio}%` }} />
    </div>
  )
}

function ContractCard({ contract, due, onOpen }: { contract: Contract; due: ContractDueWindow; onOpen: () => void }) {
  const state = contractDueState(contract, due)
  return (
    <li onClick={onOpen} className="min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/admin/contracts/${contract.id}`} onClick={e => e.stopPropagation()} className="font-semibold text-slate-900 hover:text-sky-700">
            Phòng {contract.room.code}
          </Link>
          <p className="truncate text-xs text-slate-500">{contract.room.building.name}</p>
        </div>
        <Badge size="sm" tone={contractStatusTones[contract.status]} dot>{contractStatusLabels[contract.status]}</Badge>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-800">{contract.tenant.full_name}<span className="font-normal text-slate-500"> · {contract.tenant.phone}</span></p>
      {contract.status === 'draft' && <div className="mt-2"><Badge size="sm" tone={depositStatusTone(contract.deposit_status)}>{depositStatusText(contract)}</Badge></div>}
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0 text-xs text-slate-600">
          <p className="tabular-nums">{formatDate(contract.start_date)} – {formatDate(contract.end_date)}</p>
          <TermBar contract={contract} today={due.today} state={state} />
          <div className="mt-1"><DueNote state={state} /></div>
        </div>
        <p className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">{formatVND(contract.monthly_rent)}<span className="text-xs font-normal text-slate-500">/tháng</span></p>
      </div>
    </li>
  )
}

export function AdminContractsPage() {
  const routerNavigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const urlFilters = Object.fromEntries(filterKeys.map(field => [field, params.get(field) ?? ''])) as ContractFilters
  const scope = scopeKeys.map(field => params.get(field) ?? '').join('|')
  const parsed = contractFiltersSchema.safeParse(urlFilters)
  const filters = parsed.success ? parsed.data : null
  const rawPage = params.get('page') ?? '1'
  const page = /^[1-9]\d{0,8}$/.test(rawPage) ? Number(rawPage) : 1
  const [retry, setRetry] = useState(0)
  const filtersJson = filters ? JSON.stringify(filters) : ''
  const key = `${filtersJson}:${page}:${retry}`
  const [result, setResult] = useState<{ key: string; data?: ContractPage; error?: string }>()
  const [countsFor, setCountsFor] = useState<{ scope: string; counts: ContractTabCounts }>()
  const queryText = filters?.q ?? ''
  const [searchInput, setSearchInput] = useState(queryText)

  useEffect(() => { setSearchInput(queryText) }, [queryText])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed !== queryText) {
        const merged = { ...(filters ?? urlFilters), q: trimmed }
        const search = new URLSearchParams()
        for (const field of filterKeys) { const value = merged[field]; if (value) search.set(field, value) }
        setParams(search, { replace: true })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, queryText, filters, urlFilters, setParams])

  useEffect(() => {
    if (!filtersJson) return
    const requestKey = `${filtersJson}:${page}:${retry}`
    const controller = new AbortController()
    getContracts(page, JSON.parse(filtersJson) as ContractFilters, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setResult({ key: requestKey, data }); if (data.meta.counts) setCountsFor({ scope, counts: data.meta.counts }) } })
      .catch(failure => { if (!controller.signal.aborted) { setResult({ key: requestKey, error: apiErrorMessage(failure) }) } })
    return () => controller.abort()
  }, [filtersJson, page, retry, scope])

  const current = result?.key === key ? result : undefined
  const { value: shown, stale } = useKeepPrevious(current?.data ? current : undefined)
  const today = businessToday()
  const due: ContractDueWindow = shown?.data?.meta.due ?? { today, expiring_until: today, expiring_warning_days: 0 }
  const activeTab: TabId = (filters?.due || filters?.status || '') as TabId
  const counts = countsFor?.scope === scope ? countsFor.counts : undefined
  const tabs = tabDefs.map(tab => ({ id: tab.id, label: tab.label, count: counts?.[tab.count] }))
  const hasFilters = !!filters && filterKeys.some(field => (filters[field] ?? '') !== '')

  function navigate(next: Partial<ContractFilters>, nextPage = 1) {
    const merged = { ...(filters ?? urlFilters), ...next }
    const search = new URLSearchParams()
    for (const field of filterKeys) { const value = merged[field]; if (value) search.set(field, value) }
    if (nextPage > 1) search.set('page', String(nextPage))
    setParams(search)
  }

  function clearFilters() {
    setSearchInput('')
    setParams(new URLSearchParams())
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hợp đồng thuê</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi thời hạn, tiền cọc và trạng thái của từng hợp đồng.</p>
        </div>
        <Link to="/admin/contracts/new" className="self-start sm:self-auto shrink-0">
          <Button icon={<Plus className="w-4 h-4" />}>Hợp đồng mới</Button>
        </Link>
      </header>

      <div className="space-y-3">
        <div className="flex flex-col gap-3">
          <Tabs size="sm" tabs={tabs} activeTab={activeTab} onChange={value => navigate(tabDefs.find(tab => tab.id === value)?.filter ?? {})} />
          <div className="flex w-full items-center gap-2">
            <div className="relative w-full max-w-md">
              <label htmlFor="contract-q" className="sr-only">Tìm hợp đồng</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="contract-q"
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Tìm người thuê, phòng, mã hợp đồng"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-slate-400 hover:text-slate-600"
                  aria-label="Xóa từ khóa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {(hasFilters || !filters) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} icon={<RotateCcw className="h-3.5 w-3.5" />}>Xóa lọc</Button>
            )}
          </div>
        </div>
        {filters && (filters.building_id || filters.room_id || filters.user_id) && (
          <p className="text-xs text-slate-500">
            Đang xem hợp đồng của {[filters.building_id && 'một tòa nhà', filters.room_id && 'một phòng', filters.user_id && 'một người thuê'].filter(Boolean).join(', ')}.
          </p>
        )}
      </div>

      {!filters ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Đường dẫn có bộ lọc không hợp lệ. Hãy xóa lọc để xem danh sách.
        </div>
      ) : current?.error ? (
        <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm text-rose-700">{current?.error}</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử lại</Button>
            <a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a>
          </div>
        </div>
      ) : !shown?.data ? (
        <p role="status" className="py-6 text-sm text-slate-500">Đang tải danh sách hợp đồng…</p>
      ) : (
        <RefreshingFrame busy={stale} className="space-y-4">{shown.data.data.length === 0 ? (
          <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-700">{hasFilters ? 'Không có hợp đồng phù hợp bộ lọc.' : 'Chưa có hợp đồng nào.'}</p>
            {hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button>
            ) : (
              <Link to="/admin/contracts/new" className="inline-block text-sm font-semibold text-sky-700 underline">Lập hợp đồng đầu tiên</Link>
            )}
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden" aria-label="Danh sách hợp đồng">
              {shown.data.data.map(contract => (
                <ContractCard key={contract.id} contract={contract} due={due} onOpen={() => routerNavigate(`/admin/contracts/${contract.id}`)} />
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white xl:block">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Phòng</th>
                    <th className="px-5 py-3 font-medium">Người thuê</th>
                    <th className="px-5 py-3 font-medium">Thời hạn</th>
                    <th className="px-5 py-3 text-right font-medium">Tiền thuê</th>
                    <th className="px-5 py-3 font-medium">Tiền cọc</th>
                    <th className="px-5 py-3 font-medium">Trạng thái</th>
                    <th className="w-10 px-3 py-3" aria-label="Mở"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {shown.data.data.map(contract => {
                    const state = contractDueState(contract, due)
                    return (
                      <tr key={contract.id} onClick={() => routerNavigate(`/admin/contracts/${contract.id}`)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <Link to={`/admin/contracts/${contract.id}`} onClick={e => e.stopPropagation()} className="font-semibold text-slate-900 hover:text-sky-700">
                            Phòng {contract.room.code}
                          </Link>
                          <span className="block max-w-56 truncate text-xs text-slate-500" title={contract.room.building.name}>{contract.room.building.name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="block whitespace-nowrap font-medium text-slate-900">{contract.tenant.full_name}</span>
                          <span className="text-xs text-slate-500 tabular-nums">{contract.tenant.phone}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="whitespace-nowrap tabular-nums">{formatDate(contract.start_date)} – {formatDate(contract.end_date)}</span>
                          <TermBar contract={contract} today={due.today} state={state} />
                          <div className="mt-1 empty:hidden"><DueNote state={state} /></div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-900 tabular-nums">{formatVND(contract.monthly_rent)}</td>
                        <td className="px-5 py-3.5"><Badge size="sm" tone={depositStatusTone(contract.deposit_status)}>{depositStatusText(contract)}</Badge></td>
                        <td className="px-5 py-3.5">
                          <Badge size="sm" tone={contractStatusTones[contract.status]} dot>{contractStatusLabels[contract.status]}</Badge>
                          <span className="mt-1 block font-mono text-[11px] text-slate-400">{contractLabel(contract)}</span>
                        </td>
                        <td className="px-3 py-3.5 text-slate-300 group-hover:text-slate-500"><ChevronRight className="h-4 w-4" aria-hidden="true" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {shown.data.meta.last_page > 1 ? (
              <nav aria-label="Phân trang hợp đồng" className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                <p>Trang {shown.data.meta.current_page}/{shown.data.meta.last_page} · {shown.data.meta.total} hợp đồng</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => navigate({}, page - 1)}>Trang trước</Button>
                  <Button variant="outline" size="sm" disabled={page >= shown.data.meta.last_page} onClick={() => navigate({}, page + 1)}>Trang sau</Button>
                </div>
              </nav>
            ) : (
              <p className="text-sm text-slate-500">{shown.data.meta.total} hợp đồng</p>
            )}
          </>
        )}</RefreshingFrame>
      )}
    </div>
  )
}
