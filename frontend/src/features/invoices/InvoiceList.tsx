import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { FileText, Plus } from 'lucide-react'
import { isAxiosError } from 'axios'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate, formatVND } from '@/lib/format'
import { getInvoices } from './api'
import { CreateInvoiceForm } from './CreateInvoiceForm'
import { invoiceFiltersSchema } from './schemas'
import { invoiceStatusLabels, type Invoice, type InvoicePage } from './types'

export function InvoiceBadge({ invoice }: { invoice: Invoice }) {
  const tone: BadgeTone = invoice.is_overdue ? 'rose' : ({ draft: 'amber', issued: 'sky', partially_paid: 'indigo', paid: 'emerald', cancelled: 'slate' } as const)[invoice.status]
  return <Badge tone={tone}>{invoice.is_overdue ? 'Quá hạn' : invoiceStatusLabels[invoice.status]}</Badge>
}

function ResidentInvoiceCards({ invoices, base }: { invoices: Invoice[]; base: string }) {
  if (!invoices.length) return <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Chưa có hóa đơn trong phạm vi đã chọn.</p>
  return <div className="space-y-4">{invoices.map(invoice => <article key={invoice.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold">Kỳ {formatDate(invoice.period)}</h2><p className="mt-1 text-xs text-slate-500">{invoice.invoice_number ?? `Hóa đơn #${invoice.id}`} · Hạn: {invoice.due_date ? formatDate(invoice.due_date) : 'Chưa phát hành'}</p></div><InvoiceBadge invoice={invoice} /></header>
    <div className="grid gap-4 p-5 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Phòng / Loại hóa đơn</p><p className="mt-1 font-bold">{invoice.room.code}</p><p className="text-xs text-slate-500">{invoice.room.building_name} · {({ monthly: 'Định kỳ tháng', final: 'Tất toán', adjustment: 'Điều chỉnh' })[invoice.type]}</p></div><div><p className="text-xs text-slate-500">Tổng tiền phát sinh</p><p className="mt-1 font-mono font-bold">{formatVND(invoice.total_amount)}</p><p className="text-xs text-slate-500">Đã trả: {formatVND(invoice.paid_amount)}</p></div><div><p className="text-xs text-slate-500">Còn phải trả</p><p className="mt-1 font-mono text-xl font-bold text-sky-800">{formatVND(invoice.outstanding_amount)}</p></div></div>
    <footer className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3"><Link to={`${base}/${invoice.id}`} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">Xem chi tiết hóa đơn</Link></footer>
  </article>)}</div>
}
export function InvoiceList({ admin = false }: { admin?: boolean }) {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: InvoicePage; error?: string }>()
  const status = params.get('status') ?? '', period = params.get('period') ?? '', overdue = params.get('overdue') ?? '', contract_id = params.get('contract_id') ?? '', page = params.get('page') ?? '1'
  const key = `${status}:${period}:${overdue}:${contract_id}:${page}:${retry}`
  const valid = invoiceFiltersSchema.safeParse({ status, period, overdue, contract_id, page }).success
  useEffect(() => {
    if (!valid) return
    const abort = new AbortController()
    getInvoices(invoiceFiltersSchema.parse({ status, period, overdue, contract_id, page }), abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(failure => { if (!abort.signal.aborted) { setResult({ key, error: apiErrorMessage(failure) }); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() } })
    return () => abort.abort()
  }, [key, status, period, overdue, contract_id, page, valid, refresh])
  const data = result?.key === key ? result.data : undefined
  const error = !valid ? 'Bộ lọc không hợp lệ. Hãy xóa hoặc chọn lại.' : result?.key === key ? result.error : undefined
  const base = admin ? '/admin/invoices' : '/resident/invoices'
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params); if (value) next.set(name, value); else next.delete(name)
    if (name !== 'page') next.delete('page'); setParams(next)
  }
  const tabs = [{ id: '', label: 'Tất cả' }, ...(admin ? [{ id: 'draft', label: 'Bản nháp' }] : []), { id: 'issued', label: 'Đã phát hành' }, { id: 'partially_paid', label: 'Một phần' }, { id: 'paid', label: 'Đã tất toán' }, { id: 'cancelled', label: 'Đã hủy' }]
  return <div className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5"><div><p className="text-xs font-bold uppercase text-sky-700">{admin ? 'Tài chính / Hóa đơn' : 'Cư dân / Hóa đơn'}</p><h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-slate-900"><FileText className="h-6 w-6 text-sky-600" />{admin ? 'Quản lý hóa đơn & công nợ' : 'Hóa đơn & Tiền phòng của tôi'}</h1><p className="mt-2 text-sm text-slate-500">{admin ? 'Khoản thu có căn cứ, số tiền và trạng thái được ghi nhận từ hệ thống.' : 'Xem hóa đơn và công nợ của bạn, kể cả sau khi đã trả phòng.'}</p>{admin && contract_id && <p role="status" className="mt-2 text-sm text-sky-800">Đang xem hóa đơn của hợp đồng #{contract_id}</p>}</div>{admin && <Button disabled={busy || !data || !!error} icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Lập hóa đơn tháng</Button>}</header>
    <fieldset disabled={busy} className="space-y-4"><nav aria-label="Trạng thái hóa đơn" className="flex overflow-x-auto border-b border-slate-200">{tabs.map(tab => <button key={tab.id} type="button" onClick={() => filter('status', tab.id)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold ${status === tab.id ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500'}`}>{tab.label}</button>)}</nav>
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4"><label className="text-sm font-bold">Kỳ hóa đơn<input type="date" value={period} onChange={event => filter('period', event.target.value)} className="mt-1 block rounded-xl border border-slate-300 p-2.5" /></label><label className="flex items-center gap-2 py-3 text-sm"><input type="checkbox" checked={overdue === '1'} onChange={event => filter('overdue', event.target.checked ? '1' : '')} />Chỉ hóa đơn quá hạn</label><Button variant="ghost" onClick={() => setParams({})}>Xóa bộ lọc</Button></div>
    </fieldset>
    {error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"><p>{error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Tải lại hóa đơn</Button></div> : !data ? <p role="status">Đang tải hóa đơn…</p> : <>{!admin ? <ResidentInvoiceCards invoices={data.data} base={base} /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Hóa đơn / Kỳ', 'Phòng / Hợp đồng', 'Tổng tiền', 'Đã thanh toán', 'Còn phải trả', 'Trạng thái', ''].map((title, index) => <th key={index} className="px-4 py-3">{title}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{!data.data.length ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">Chưa có hóa đơn trong phạm vi đã chọn.</td></tr> : data.data.map(invoice => <tr key={invoice.id}><td className="px-4 py-4"><Link className="font-bold text-sky-700" to={`${base}/${invoice.id}`}>{invoice.invoice_number ?? `Nháp #${invoice.id}`}</Link><p className="text-xs text-slate-500">{formatDate(invoice.period)} · {({ monthly: 'Hàng tháng', final: 'Tất toán', adjustment: 'Điều chỉnh' })[invoice.type]}</p></td><td className="px-4 py-4">{invoice.room.code}<p className="text-xs text-slate-500">{invoice.room.building_name} · {invoice.contract_number ?? `HĐ #${invoice.contract_id}`}</p>{admin && <p className="text-xs text-slate-500">{invoice.tenant_name}</p>}</td><td className="px-4 py-4">{formatVND(invoice.total_amount)}</td><td className="px-4 py-4">{formatVND(invoice.paid_amount)}</td><td className="px-4 py-4 font-bold text-sky-800">{formatVND(invoice.outstanding_amount)}<p className="text-xs font-normal text-slate-500">Hạn: {invoice.due_date ? formatDate(invoice.due_date) : 'Chưa phát hành'}</p></td><td className="px-4 py-4"><InvoiceBadge invoice={invoice} /></td><td className="px-4 py-4"><Link className="text-sky-700 underline" to={`${base}/${invoice.id}`}>Chi tiết</Link></td></tr>)}</tbody></table></div>}<nav aria-label="Phân trang hóa đơn" className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>Trang {data.meta.current_page}/{data.meta.last_page} · {data.meta.total} hóa đơn</p><div className="flex gap-2"><Button variant="outline" disabled={busy || Number(page) <= 1} onClick={() => filter('page', String(Number(page) - 1))}>Hóa đơn trước</Button><Button variant="outline" disabled={busy || Number(page) >= data.meta.last_page} onClick={() => filter('page', String(Number(page) + 1))}>Hóa đơn sau</Button></div></nav></>}
    <Modal isOpen={creating} onClose={() => { if (!busy) setCreating(false) }} title="Lập hóa đơn tháng" maxWidth="lg">{creating && <CreateInvoiceForm onBusyChange={setBusy} onAuthFailure={refresh} onSaved={invoice => { setCreating(false); navigate(`${base}/${invoice.id}`) }} />}</Modal>
  </div>
}
