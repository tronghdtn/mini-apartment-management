import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, FileText } from 'lucide-react'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'
import { getInvoice, invoiceAction, reissueFinalInvoice } from './api'
import { InvoiceActionForm, type InvoiceDialog } from './InvoiceActionForm'
import { InvoiceBadge } from './InvoiceList'
import type { Invoice } from './types'

export function InvoiceDetail({ admin = false, renderPayments }: { admin?: boolean; renderPayments?: (invoice: Invoice, onChanged: () => void) => ReactNode }) {
  const { invoiceId: id = '' } = useParams()
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const activeId = useRef('')
  const flight = useRef(false)
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: Invoice; error?: string }>()
  const [action, setAction] = useState<InvoiceDialog | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const key = `${id}:${version}`
  const validId = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))
  useEffect(() => {
    const abort = new AbortController(); activeId.current = id
    if (validId) getInvoice(id, abort.signal).then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(failure => { if (!abort.signal.aborted) { setResult({ key, error: apiErrorMessage(failure) }); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() } })
    return () => { abort.abort(); activeId.current = '' }
  }, [id, key, validId, refresh])
  const data = result?.key === key ? result.data : undefined
  const error = !validId ? 'Mã hóa đơn không hợp lệ.' : result?.key === key ? result.error : undefined
  const base = admin ? '/admin/invoices' : '/resident/invoices'
  function saved() {
    if (activeId.current !== id) return
    setAction(null); setMessage('Thao tác đã được hệ thống ghi nhận.'); setVersion(value => value + 1)
  }
  function paymentsChanged() {
    setMessage('Thanh toán đã được cập nhật.'); setVersion(value => value + 1)
  }
  async function recalculate(invoice: Invoice) {
    if (flight.current) return
    flight.current = true; setBusy(true); setMessage('')
    try { await invoiceAction(invoice.id, 'refresh', invoice.revision!); if (activeId.current === id) { setVersion(value => value + 1); setMessage('Đã cập nhật bản nháp; hãy kiểm tra số tiền trước khi phát hành.') } }
    catch (failure) { if (activeId.current === id) { setMessage(apiErrorMessage(failure)); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() } }
    finally { flight.current = false; setBusy(false) }
  }
  async function reissue(invoice: Invoice) {
    if (flight.current || !invoice.revision) return
    flight.current = true; setBusy(true); setMessage('')
    try {
      const replacement = await reissueFinalInvoice(invoice.id, invoice.revision)
      if (activeId.current === id) navigate(`${base}/${replacement.id}`)
    } catch (failure) {
      if (activeId.current === id) {
        setMessage(apiErrorMessage(failure))
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
      }
    } finally { flight.current = false; setBusy(false) }
  }
  return <div className="mx-auto max-w-4xl space-y-6"><Link to={base} className="inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ArrowLeft className="h-4 w-4" />Danh sách hóa đơn</Link>
    {error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5"><p>{error}</p><Button variant="outline" onClick={() => setVersion(value => value + 1)}>Tải lại chi tiết</Button></div> : !data ? <p role="status">Đang tải chi tiết hóa đơn…</p> : <>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5"><div><p className="text-xs font-bold uppercase text-sky-700">Tài chính / Chi tiết hóa đơn</p><h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold"><FileText className="h-6 w-6 text-sky-600" />{data.invoice_number ?? `Hóa đơn nháp #${data.id}`}</h1><p className="mt-2 text-sm text-slate-500">{data.room.building_name} · {data.room.code} · {data.contract_number ?? `HĐ #${data.contract_id}`} · {data.tenant_name}</p></div><InvoiceBadge invoice={data} /></header>
      {message && <p role="status" className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">{message}</p>}
      {admin && data.contract_status === 'terminated' && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Hợp đồng đã thanh lý. Hóa đơn cần quy trình điều chỉnh riêng; không được hủy trực tiếp.</p>}
      {admin && data.contract_closure_note && <p className="whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Ghi chú bàn giao hiện tại của hợp đồng: {'\n'}{data.contract_closure_note}</p>}
      <div className="grid gap-4 sm:grid-cols-3">{[{ label: 'Tổng hóa đơn', amount: data.total_amount }, { label: 'Đã thanh toán', amount: data.paid_amount }, { label: 'Còn phải trả', amount: data.outstanding_amount }].map(item => <section key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 font-display text-2xl font-bold text-sky-800">{formatVND(item.amount)}</p></section>)}</div>
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-2"><p>Kỳ hóa đơn: <strong>{formatDate(data.period)}</strong></p><p>Hạn thanh toán: <strong>{data.due_date ? formatDate(data.due_date) : 'Chưa phát hành'}</strong></p><p>Phát hành: {data.issued_at ? formatDateTime(data.issued_at) : 'Chưa phát hành'}</p>{data.related_invoice_id && <Link className="text-sky-700 underline" to={`${base}/${data.related_invoice_id}`}>Thay thế hóa đơn #{data.related_invoice_id}</Link>}{data.replacement_invoice_id && <Link className="text-sky-700 underline" to={`${base}/${data.replacement_invoice_id}`}>Hóa đơn lập lại #{data.replacement_invoice_id}</Link>}{data.cancel_reason && <p className="text-rose-700 sm:col-span-2">Lý do hủy: {data.cancel_reason}</p>}{data.total_amount === 0 && data.status === 'paid' && <p className="rounded-xl bg-teal-50 p-3 text-teal-800 sm:col-span-2">Hóa đơn 0đ đã tất toán; không có giao dịch thu tiền.</p>}</section>
      {admin && <fieldset disabled={busy} className="flex flex-wrap gap-2">{data.status === 'draft' && data.revision && <><Button variant="outline" onClick={() => void recalculate(data)}>Cập nhật phần tự sinh</Button><Button onClick={() => { setMessage(''); setAction({ kind: 'other', invoice: data }) }}>Thêm khoản khác</Button>{['monthly', 'final'].includes(data.type) && <Button onClick={() => { setMessage(''); setAction({ kind: 'issue', invoice: data }) }}>Phát hành hóa đơn</Button>}</>}{data.type === 'final' && data.status === 'cancelled' && !data.replacement_invoice_id && data.revision && <Button variant="outline" onClick={() => void reissue(data)}>Lập lại hóa đơn tất toán</Button>}{data.contract_status !== 'terminated' && data.status !== 'cancelled' && <Button variant="outline" disabled={data.paid_amount > 0} onClick={() => { setMessage(''); setAction({ kind: 'cancel', invoice: data }) }}>Hủy hóa đơn</Button>}<Button variant="ghost" onClick={() => setVersion(value => value + 1)}>Tải lại hóa đơn</Button></fieldset>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h2 className="border-b border-slate-100 p-5 text-lg font-bold">Khoản thu</h2><div className="overflow-x-auto"><table className="w-full min-w-160 text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Khoản thu / Căn cứ', 'Số lượng', 'Đơn giá', 'Thành tiền', ''].map((text, index) => <th className="px-4 py-3" key={index}>{text}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.items?.map(item => <tr key={item.id}><td className="max-w-96 px-4 py-4"><p className="font-bold">{item.description}</p>{item.basis && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-600">Căn cứ: {item.basis}</p>}{item.calculation?.active_days !== undefined && <p className="text-xs text-slate-500">{item.calculation.active_days}/{item.calculation.days_in_month} ngày của kỳ {formatDate(item.calculation.period ?? '')}</p>}</td><td className="px-4 py-4 font-mono">{item.quantity}</td><td className="px-4 py-4 whitespace-nowrap">{formatVND(item.unit_price)}</td><td className="px-4 py-4 whitespace-nowrap font-bold text-sky-800">{formatVND(item.amount)}</td><td className="px-4 py-4">{admin && data.status === 'draft' && item.item_type === 'other' && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => setAction({ kind: 'other', invoice: data, item })}>Sửa khoản #{item.id}</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => setAction({ kind: 'remove', invoice: data, item })}>Gỡ khoản #{item.id}</Button></div>}</td></tr>)}</tbody></table></div></section>
      {!!data.meter_readings?.length && <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">{data.type === 'final' ? 'Mốc điện nước đã đưa vào tất toán' : 'Mốc điện nước kỳ tiêu thụ trước'}</h2>{data.meter_readings.map(reading => <p key={reading.id} className="text-sm text-slate-600">{reading.service} · {formatDate(reading.period)}: {reading.previous_reading} → {reading.current_reading} · Lượng {reading.consumption} · Giá {formatVND(reading.unit_price)} · Tiền {formatVND(reading.amount)}</p>)}</section>}
      {admin && !!data.manual_history?.length && <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Lịch sử khoản khác</h2>{data.manual_history.map(history => <div key={history.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">Khoản #{history.id}{history.voided ? ' · Đã gỡ' : ''}</p>{history.audit.map((event, index) => <p key={index} className="mt-1 break-words text-xs text-slate-600">{formatDateTime(event.at)} · Admin #{event.actor_id} · {({ created: 'Thêm', updated: 'Sửa', removed: 'Gỡ' } as Record<string, string>)[event.action] ?? event.action} · {event.before ? `${event.before.description}: ${formatVND(event.before.amount)}` : 'Chưa có'} → {event.after ? `${event.after.description}: ${formatVND(event.after.amount)}` : 'Đã gỡ'} · Căn cứ: {event.reason}</p>)}</div>)}</section>}
      {renderPayments?.(data, paymentsChanged)}
    </>}
    <Modal isOpen={!!action && String(action.invoice.id) === id} onClose={() => { if (!busy) setAction(null) }} title={action?.kind === 'issue' ? 'Phát hành hóa đơn' : action?.kind === 'cancel' ? 'Hủy hóa đơn' : action?.kind === 'remove' ? 'Gỡ khoản khác' : 'Khoản khác có căn cứ'} maxWidth="lg">{action && String(action.invoice.id) === id && <InvoiceActionForm key={`${action.invoice.id}:${action.kind}:${action.item?.id ?? ''}`} action={action} onSaved={saved} onBusyChange={setBusy} onAuthFailure={refresh} />}</Modal>
  </div>
}
