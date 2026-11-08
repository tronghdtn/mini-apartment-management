import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { isAxiosError } from 'axios'
import { AlertCircle, ChevronLeft, ChevronRight, FileText, RefreshCw, RotateCcw, Search, Users, Wallet, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate } from '@/lib/format'
import { getDebts } from '@/features/debts/api'
import { debtFiltersSchema } from '@/features/debts/schemas'
import type { DebtPage, DebtStatus, DebtSummary } from '@/features/debts/types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'
import { useKeepPrevious } from '@/hooks/useKeepPrevious'

const emptySummary: DebtSummary = { total_outstanding: '0', overdue_outstanding: '0', invoice_count: 0, debtor_count: 0 }
const currency = new Intl.NumberFormat('vi-VN')
function formatDebtAmount(value: string): string {
  try { return `${currency.format(BigInt(value))} ₫` } catch { return '—' }
}
const statusLabels: Record<DebtStatus, string> = { all: 'Tất cả công nợ', overdue: 'Quá hạn', not_due: 'Chưa đến hạn' }

export function AdminDebtsPage() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: DebtPage; error?: string }>()
  const status = (params.get('status') ?? 'all') as DebtStatus
  const search = params.get('search') ?? ''
  const page = params.get('page') ?? '1'
  const key = `${status}:${search}:${page}:${retry}`
  const valid = debtFiltersSchema.safeParse({ status, search, page }).success
  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => { setSearchInput(search) }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed !== search) {
        const next = new URLSearchParams(params)
        if (trimmed) next.set('search', trimmed)
        else next.delete('search')
        next.delete('page')
        setParams(next, { replace: true })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, search, params, setParams])

  useEffect(() => {
    if (!valid) return
    const abort = new AbortController()
    getDebts({ status, search, page }, abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(failure => {
        if (!abort.signal.aborted) {
          setResult({ key, error: apiErrorMessage(failure) })
          if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
        }
      })
    return () => abort.abort()
  }, [key, status, search, page, valid, refresh])

  const { value: data, stale } = useKeepPrevious(result?.key === key ? result.data : undefined)
  const error = !valid ? 'Bộ lọc công nợ không hợp lệ. Hãy chọn lại.' : result?.key === key ? result.error : undefined

  function update(name: 'status' | 'search' | 'page', value: string) {
    const next = new URLSearchParams(params)
    if (value && !(name === 'status' && value === 'all')) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.delete('page')
    setParams(next)
  }

  const summary = data?.summary ?? emptySummary
  const tabs: DebtStatus[] = ['all', 'overdue', 'not_due']
  const hasFilters = Boolean(status !== 'all' || search)

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-bold uppercase text-sky-700">Tài chính / Công nợ</p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-slate-900">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          Theo dõi công nợ
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Nhóm các hóa đơn còn phải thu theo hợp đồng. Công nợ vẫn hiển thị sau khi hợp đồng đã thanh lý.
        </p>
      </header>

      <section aria-label="Tổng quan công nợ" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Tổng còn phải thu', value: formatDebtAmount(summary.total_outstanding), icon: Wallet, tone: 'text-sky-700' },
          { label: 'Nợ quá hạn', value: formatDebtAmount(summary.overdue_outstanding), icon: AlertCircle, tone: 'text-rose-700' },
          { label: 'Người thuê còn nợ', value: currency.format(summary.debtor_count), icon: Users, tone: 'text-amber-700' },
          { label: 'Hóa đơn còn dư', value: currency.format(summary.invoice_count), icon: FileText, tone: 'text-teal-700' },
        ].map(card => (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
              <span>{card.label}</span>
              <card.icon className={`h-5 w-5 ${card.tone}`} />
            </div>
            <p className={`mt-3 break-words font-display text-2xl font-bold ${card.tone}`}>{data ? card.value : '—'}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <nav aria-label="Lọc trạng thái công nợ" className="flex flex-wrap gap-1.5">
          {tabs.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => update('status', tab)}
              aria-current={status === tab ? 'page' : undefined}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                status === tab ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {statusLabels[tab]}
            </button>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              maxLength={100}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs sm:text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition"
              placeholder="Tìm người thuê, phòng, tòa, mã HĐ..."
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Xóa từ khóa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setParams({}) }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}
          <Button type="button" variant="outline" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setRetry(value => value + 1)}>
            Tải lại
          </Button>
        </div>
      </section>

      {error ? (
        <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p>{error}</p>
          <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử tải lại</Button>
        </div>
      ) : !data ? (
        <p role="status">Đang tải công nợ…</p>
      ) : (
        <RefreshingFrame busy={stale} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <p>{statusLabels[status]} · {data.meta.total} hợp đồng</p>
            <p>Tổng quan luôn tính trên toàn bộ hóa đơn còn nợ.</p>
          </div>
          {!data.data.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <Wallet className="mx-auto h-8 w-8 text-slate-400" />
              <h2 className="mt-3 font-bold text-slate-800">Không có công nợ phù hợp</h2>
              <p className="mt-1 text-sm text-slate-500">Thử đổi trạng thái hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block shadow-xs">
                <table className="w-full min-w-220 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      {['Cư dân / Hợp đồng', 'Tòa nhà / Phòng', 'Hóa đơn còn nợ', 'Tổng còn nợ', 'Quá hạn lâu nhất', 'Thao tác'].map((title, i) => (
                        <th className={`px-4 py-3.5 ${i === 5 ? 'text-right' : ''}`} key={title}>{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.data.map(debt => (
                      <tr
                        key={debt.contract_id}
                        onClick={() => navigate(`/admin/invoices?contract_id=${debt.contract_id}`)}
                        className="hover:bg-sky-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900">{debt.tenant.full_name}</p>
                          <p className="text-xs text-slate-500 mb-1">{debt.contract_number ?? `Hợp đồng #${debt.contract_id}`}</p>
                          <Badge tone={debt.contract_status === 'active' ? 'emerald' : 'slate'}>
                            {debt.contract_status === 'active' ? 'Đang thuê' : 'Đã kết thúc'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900">Phòng {debt.room.code}</p>
                          <p className="text-xs text-slate-500">{debt.room.building_name}</p>
                        </td>
                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                          <p className="font-semibold text-slate-800">{debt.invoice_count} hóa đơn</p>
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs font-semibold text-sky-700 hover:underline">Xem từng hóa đơn</summary>
                            <ul className="mt-2 space-y-1 text-xs">
                              {debt.invoices.map(invoice => (
                                <li key={invoice.id}>
                                  <Link className="font-semibold text-sky-700 underline" to={`/admin/invoices/${invoice.id}`}>
                                    {invoice.invoice_number ?? `Hóa đơn #${invoice.id}`}
                                  </Link>{' '}
                                  · {formatDate(invoice.period)} · {formatDebtAmount(String(invoice.outstanding_amount))}
                                  {invoice.is_overdue && <span className="ml-1 text-rose-700 font-semibold">Quá hạn</span>}
                                </li>
                              ))}
                            </ul>
                          </details>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-bold text-sky-800">
                          {formatDebtAmount(debt.outstanding_amount)}
                          {debt.overdue_amount !== '0' && <p className="text-xs font-normal text-rose-700">Quá hạn: {formatDebtAmount(debt.overdue_amount)}</p>}
                        </td>
                        <td className="px-4 py-4">
                          {debt.oldest_overdue_due_date ? <span className="text-rose-700 font-semibold">{formatDate(debt.oldest_overdue_due_date)}</span> : 'Chưa quá hạn'}
                        </td>
                        <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <Link
                            className="inline-block px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/70 text-xs font-semibold transition whitespace-nowrap"
                            to={`/admin/invoices?contract_id=${debt.contract_id}`}
                          >
                            Mở hóa đơn & Thu tiền
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 md:hidden">
                {data.data.map(debt => (
                  <article
                    key={debt.contract_id}
                    onClick={() => navigate(`/admin/invoices?contract_id=${debt.contract_id}`)}
                    className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-sky-300 transition"
                  >
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold">{debt.tenant.full_name}</h2>
                        <p className="text-xs text-slate-500">{debt.contract_number ?? `Hợp đồng #${debt.contract_id}`}</p>
                      </div>
                      <Badge tone={debt.contract_status === 'active' ? 'emerald' : 'slate'}>
                        {debt.contract_status === 'active' ? 'Đang thuê' : 'Đã kết thúc'}
                      </Badge>
                    </header>
                    <p className="text-sm">{debt.room.building_name} · Phòng {debt.room.code}</p>
                    <p className="text-xl font-bold text-sky-800">{formatDebtAmount(debt.outstanding_amount)}</p>
                    <p className="text-sm text-slate-600">{debt.invoice_count} hóa đơn còn dư · {debt.overdue_invoice_count} quá hạn</p>
                    {debt.oldest_overdue_due_date && <p className="text-sm text-rose-700">Quá hạn từ {formatDate(debt.oldest_overdue_due_date)}</p>}
                    <Link
                      onClick={e => e.stopPropagation()}
                      className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"
                      to={`/admin/invoices?contract_id=${debt.contract_id}`}
                    >
                      Mở hóa đơn
                    </Link>
                  </article>
                ))}
              </div>
              <nav aria-label="Phân trang công nợ" className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p>Trang {data.meta.current_page}/{data.meta.last_page} · {data.meta.total} hợp đồng</p>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={Number(page) <= 1} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => update('page', String(Number(page) - 1))}>Trước</Button>
                  <Button variant="outline" disabled={Number(page) >= data.meta.last_page} icon={<ChevronRight className="h-4 w-4" />} onClick={() => update('page', String(Number(page) + 1))}>Sau</Button>
                </div>
              </nav>
            </>
          )}
        </RefreshingFrame>
      )}
    </div>
  )
}
