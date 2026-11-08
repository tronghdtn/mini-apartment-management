import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { isAxiosError } from 'axios'
import { Printer, RotateCcw, RotateCw, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime, formatVND } from '@/lib/format'
import { getPayments } from './api'
import { paymentFiltersSchema } from './schemas'
import { paymentMethodLabels, paymentStatusLabels, type Payment, type PaymentPage } from './types'
import { PrivatePaymentProof } from './PrivatePaymentProof'
import { PaymentReviewForm } from './PaymentReviewForm'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'
import { useKeepPrevious } from '@/hooks/useKeepPrevious'

const statusTabs = [
  { id: '', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ đối soát' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'rejected', label: 'Đã từ chối' },
]
const statusTones = { pending: 'amber', confirmed: 'emerald', rejected: 'rose' } as const

/** Tên ngắn để gắn vào nhãn nút/ảnh cho trình đọc màn hình, thay cho số ID nội bộ. */
function paymentLabel(payment: Payment) {
  return `${formatVND(payment.amount)} của ${payment.invoice.tenant_name}, ${formatDateTime(payment.created_at)}`
}

export function PaymentsWorkspace({ admin = false, invoiceId, onChanged, disabled = false, onBusyChange }: { admin?: boolean; invoiceId?: number; onChanged?: () => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const { refresh } = useAuth()
  const [params, setParams] = useSearchParams()
  const [version, setVersion] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const busy = disabled || reviewing
  const [result, setResult] = useState<{ key: string; data?: PaymentPage; error?: string }>()
  const [action, setAction] = useState<{ kind: 'confirm' | 'reject'; payment: Payment } | null>(null)
  const status = params.get('status') ?? ''
  const method = params.get('method') ?? ''
  const page = params.get('page') ?? '1'
  const invoiceFilter = invoiceId ? String(invoiceId) : (params.get('invoice_id') ?? '')
  const key = `${status}:${method}:${page}:${invoiceFilter}:${version}`
  const valid = paymentFiltersSchema.safeParse({ status, method, page, invoice_id: invoiceFilter }).success
  useEffect(() => {
    if (!valid) return
    const abort = new AbortController()
    getPayments(paymentFiltersSchema.parse({ status, method, page, invoice_id: invoiceFilter }), abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(failure => {
        if (!abort.signal.aborted) {
          setResult({ key, error: apiErrorMessage(failure) })
          if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
        }
      })
    return () => abort.abort()
  }, [status, method, page, invoiceFilter, key, valid, refresh])
  const { value: data, stale } = useKeepPrevious(result?.key === key ? result.data : undefined)
  const error = !valid ? 'Bộ lọc thanh toán không hợp lệ. Hãy chọn lại.' : result?.key === key ? result.error : undefined
  const hasFilters = !!(status || method || (!invoiceId && params.get('invoice_id')))
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value); else next.delete(name)
    if (name !== 'page') next.delete('page')
    setParams(next)
  }
  function clearFilters() {
    const next = new URLSearchParams(params)
    for (const name of ['status', 'method', 'page', 'invoice_id']) next.delete(name)
    setParams(next)
  }
  function reload() { setAction(null); setVersion(value => value + 1); onChanged?.() }
  const base = admin ? '/admin/invoices' : '/resident/invoices'

  return (
    <section className="space-y-4">
      {invoiceId && <h3 className="text-base font-semibold text-slate-900">Lịch sử thanh toán</h3>}
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <legend className="sr-only">Lọc thanh toán</legend>
        <Tabs size="sm" tabs={statusTabs} activeTab={status} onChange={value => filter('status', value)} />
        <div className="flex flex-wrap items-center gap-2">
          {!invoiceId && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="sr-only sm:not-sr-only">Hình thức</span>
              <select value={method} onChange={event => filter('method', event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">Mọi hình thức</option>
                {Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          )}
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} icon={<RotateCcw className="h-3.5 w-3.5" />}>Xóa lọc</Button>}
          <button type="button" onClick={() => setVersion(value => value + 1)} aria-label="Tải lại danh sách thanh toán" title="Tải lại" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 cursor-pointer">
            <RotateCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </fieldset>

      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        : !data ? <p role="status" className="text-sm text-slate-500">Đang tải thanh toán…</p>
        : (
          <RefreshingFrame busy={stale} className="space-y-4">
            {!data.data.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <Wallet className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
                <p className="mt-2 text-sm text-slate-600">{hasFilters ? 'Không có khoản thanh toán phù hợp bộ lọc.' : 'Chưa có khoản thanh toán nào.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500 whitespace-nowrap">
                    <tr>
                      <th className="px-5 py-3 font-medium">{admin ? 'Người nộp' : 'Nộp lúc'}</th>
                      <th className="px-4 py-3 font-medium">Hóa đơn</th>
                      <th className="px-4 py-3 text-right font-medium">Số tiền</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                      <th className="px-4 py-3 font-medium" aria-label="Thao tác"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.data.map(payment => {
                      const label = paymentLabel(payment)
                      return (
                        <tr key={payment.id} className="align-top">
                          <td className="px-5 py-4">
                            {admin && <p className="font-semibold text-slate-900">{payment.invoice.tenant_name}</p>}
                            <p className={admin ? 'text-xs text-slate-500' : 'font-medium text-slate-900'}>Phòng {payment.invoice.room_code} · {formatDateTime(payment.created_at)}</p>
                            <p className="max-w-56 truncate text-xs text-slate-500" title={payment.invoice.building_name}>{payment.invoice.building_name}</p>
                          </td>
                          <td className="px-4 py-4">
                            <Link className="font-mono text-xs font-semibold text-sky-700 hover:underline" to={`${base}/${payment.invoice_id}`}>
                              {payment.invoice.invoice_number ?? 'Hóa đơn chưa phát hành'}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className="whitespace-nowrap font-semibold text-slate-900 tabular-nums">{formatVND(payment.amount)}</p>
                            <p className="text-xs text-slate-500">{paymentMethodLabels[payment.method]}</p>
                            {payment.method === 'deposit' && <p className="text-xs text-amber-700" title="Trừ vào tiền cọc, không phải tiền thu mới">Trừ vào tiền cọc</p>}
                          </td>
                          <td className="max-w-64 px-4 py-4">
                            <Badge size="sm" tone={statusTones[payment.status]} dot>{paymentStatusLabels[payment.status]}</Badge>
                            {payment.status === 'pending' && <p className="mt-1 text-xs text-slate-500" title="Khoản chờ đối soát chưa được trừ vào công nợ">Chưa trừ công nợ</p>}
                            {payment.receipt_number && (
                              <p className="mt-1.5 text-xs text-slate-500">Biên nhận <span className="font-mono text-slate-700">{payment.receipt_number}</span></p>
                            )}
                            {payment.reviewed_at && payment.status !== 'pending' && <p className="text-xs text-slate-400 tabular-nums">{formatDateTime(payment.reviewed_at)}</p>}
                            {payment.reject_reason && <p className="mt-1.5 whitespace-pre-wrap break-words text-xs text-rose-700">Lý do: {payment.reject_reason}</p>}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-end gap-1.5">
                              {admin && payment.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button size="sm" disabled={busy} onClick={() => setAction({ kind: 'confirm', payment })} aria-label={`Xác nhận đã nhận ${label}`}>Xác nhận</Button>
                                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setAction({ kind: 'reject', payment })} aria-label={`Từ chối ${label}`}>Từ chối</Button>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                {payment.has_proof && <PrivatePaymentProof key={payment.id} id={payment.id} label={label} onAuthFailure={refresh} />}
                                {payment.status === 'confirmed' && payment.receipt_number && (
                                  <Link to={`${admin ? '/admin' : '/resident'}/payments/${payment.id}/receipt`} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50">
                                    <Printer className="h-3.5 w-3.5" aria-hidden="true" />In biên nhận
                                  </Link>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {data.meta.last_page > 1 ? (
              <nav aria-label="Phân trang thanh toán" className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                <p>Trang {data.meta.current_page}/{data.meta.last_page} · {data.meta.total} khoản</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={busy || Number(page) <= 1} onClick={() => filter('page', String(Number(page) - 1))}>Trang trước</Button>
                  <Button variant="outline" size="sm" disabled={busy || Number(page) >= data.meta.last_page} onClick={() => filter('page', String(Number(page) + 1))}>Trang sau</Button>
                </div>
              </nav>
            ) : data.data.length > 0 && <p className="text-sm text-slate-500">{data.meta.total} khoản thanh toán</p>}
          </RefreshingFrame>
        )}
      <Modal isOpen={!!action} onClose={() => { if (!busy) reload() }} title={action?.kind === 'confirm' ? 'Xác nhận đã nhận tiền' : 'Từ chối minh chứng'} maxWidth="lg">
        {action && <PaymentReviewForm key={`${action.kind}:${action.payment.id}`} payment={action.payment} action={action.kind} onSaved={reload} onReload={reload} onBusyChange={value => { setReviewing(value); onBusyChange?.(value) }} onAuthFailure={refresh} />}
      </Modal>
    </section>
  )
}
