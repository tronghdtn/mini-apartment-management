import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'
import { confirmDepositRefund, getContractSettlement, terminateContract } from './api'
import { canConfirmDepositRefund, confirmDepositRefundSchema, terminateContractSchema, type ConfirmDepositRefundInput, type ContractSettlement, type TerminateContractInput } from './settlement'

const roomLabels = { available: 'Còn trống', occupied: 'Đang thuê', maintenance: 'Bảo trì', inactive: 'Ngừng sử dụng' }

export function ContractSettlementPanel({ contractId, onTerminated, onAuthFailure }: {
  contractId: number; onTerminated: () => void; onAuthFailure: () => void
}) {
  const [version, setVersion] = useState(0)
  const key = `${contractId}:${version}`
  const [result, setResult] = useState<{ key: string; data?: ContractSettlement; error?: string }>()
  const [action, setAction] = useState<ContractSettlement | null>(null)
  const [refundAction, setRefundAction] = useState<ContractSettlement | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const abort = new AbortController()
    getContractSettlement(contractId, abort.signal).then(data => {
      if (!abort.signal.aborted) setResult({ key, data })
    }).catch(failure => {
      if (!abort.signal.aborted) {
        setResult({ key, error: apiErrorMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
      }
    })
    return () => abort.abort()
  }, [contractId, key, onAuthFailure])
  const current = result?.key === key ? result : undefined
  const data = current?.data
  const closed = data?.status === 'terminated'
  const reload = () => { if (!busy) { setAction(null); setRefundAction(null); setVersion(value => value + 1) } }
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">4. Đối soát tiền cọc và trả phòng</h2>
      <Button variant="outline" size="sm" onClick={reload} disabled={busy}>Tải đối soát mới</Button></header>
    {!current ? <p role="status">Đang đối chiếu hóa đơn và tiền cọc…</p> : current.error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{current.error} Hãy tải đối soát mới để kiểm tra kết quả trước khi thao tác tiếp.</p> : data && <>
      {closed ? <div role="status" className="space-y-2 rounded-xl bg-teal-50 p-4 text-teal-950"><p className="font-bold">Hợp đồng đã thanh lý</p>
        <p className="text-sm">Đã ghi nhận trả phòng lúc {data.closed_at ? formatDateTime(data.closed_at) : '—'}. Trạng thái phòng hiện tại: {roomLabels[data.room_status]}.</p>
        <p className="text-sm">Cư dân giữ tài khoản và có thể thanh toán khoản nợ cũ.</p></div>
        : <p className="text-sm text-slate-600">Chỉ là bản xem trước. Khấu trừ cọc và trả phòng chỉ được lưu sau khi xác nhận; khoản chờ đối soát chưa giảm nợ.</p>}
      {!closed && data.blockers.length > 0 && <div role="alert" className="space-y-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><ul className="list-disc space-y-1 pl-5">{data.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>
        {data.pending_payment_count > 0 && <Link to="/admin/payments?status=pending" className="inline-block font-bold underline">Xử lý thanh toán chờ xác nhận</Link>}</div>}
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">Cọc đã nhận để đối soát</dt><dd className="mt-1 font-bold">{formatVND(data.held_amount)}</dd></div>
        <div><dt className="text-slate-500">{closed ? 'Đã khấu trừ cọc' : 'Dự kiến khấu trừ cọc'}</dt><dd className="mt-1 font-bold">{formatVND(data.deposit_deducted_amount)}</dd></div>
        <div><dt className="text-slate-500">Công nợ hiện tại</dt><dd className="mt-1 font-bold">{formatVND(BigInt(data.outstanding_amount))}</dd></div>
        <div><dt className="text-slate-500">{closed ? 'Còn nợ hiện tại' : 'Còn nợ sau khấu trừ dự kiến'}</dt><dd className="mt-1 font-bold text-rose-700">{formatVND(BigInt(data.outstanding_after))}</dd></div>
      </dl>
      {data.held_amount === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm">Không có cọc đã nhận để khấu trừ.</p>}
      {data.deposit_refund_amount > 0 && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        {closed && data.deposit_refunded_at && data.deposit_refunded_by != null && data.refund_outstanding_amount === 0 ? <>
          <p className="font-bold">Đã ghi nhận hoàn đủ cọc ngoài hệ thống: {formatVND(data.deposit_refund_amount)}</p>
          <p className="text-sm">Admin #{data.deposit_refunded_by} xác nhận lúc {formatDateTime(data.deposit_refunded_at)}. Cọc còn phải hoàn: {formatVND(data.refund_outstanding_amount)}.</p>
          <p className="text-sm">Đây là dấu vết xác nhận tiền đã chi bên ngoài; hệ thống không thực hiện chuyển tiền.</p>
        </> : <><p className="font-bold">Cọc còn phải hoàn ngoài hệ thống: {formatVND(data.refund_outstanding_amount ?? data.deposit_refund_amount)}</p>
          <p className="text-sm">Đây là nghĩa vụ chưa thanh toán. Đã đối soát cọc không có nghĩa đã hoàn tiền; hệ thống không thực hiện chuyển tiền.</p>
          {canConfirmDepositRefund(data) && <Button disabled={busy} onClick={() => setRefundAction(data)}>Ghi nhận đã hoàn đủ cọc</Button>}
          {closed && data.refund_outstanding_amount === undefined && <p className="text-xs">Chức năng ghi nhận hoàn cọc chưa sẵn sàng trên môi trường này.</p>}
        </>}
      </div>}
      <p className="text-xs text-slate-500">Khoản hoàn do giảm trừ hóa đơn tất toán (nếu có) xem riêng tại hóa đơn, không cộng vào cọc ở đây. Khấu trừ cọc không phải khoản tiền thu mới.</p>
      {data.invoices.length > 0 && <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-150 text-left text-sm"><caption className="p-3 text-left font-semibold">Hóa đơn còn nợ theo hạn sớm nhất</caption><thead className="bg-slate-50"><tr>{['Hóa đơn', 'Hạn trả', 'Còn nợ', 'Cọc dự kiến', 'Nợ sau đối soát'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{data.invoices.map(invoice => <tr key={invoice.id}><td className="p-3"><Link className="font-semibold text-sky-700 underline" to={`/admin/invoices/${invoice.id}`}>{invoice.invoice_number ?? `#${invoice.id}`}</Link></td><td className="whitespace-nowrap p-3">{formatDate(invoice.due_date)}</td><td className="whitespace-nowrap p-3">{formatVND(invoice.outstanding_amount)}</td><td className="whitespace-nowrap p-3">{formatVND(invoice.deposit_applied)}</td><td className="whitespace-nowrap p-3">{formatVND(invoice.outstanding_after)}</td></tr>)}</tbody></table></div>}
      {data.deposit_payments.length > 0 && <div className="space-y-2 text-sm"><h3 className="font-bold">Các khoản khấu trừ cọc đã ghi nhận</h3><ul className="space-y-2">{data.deposit_payments.map(payment => <li key={payment.id}><Link className="text-sky-700 underline" to={`/admin/invoices/${payment.invoice_id}`}>{payment.receipt_number ?? `Thanh toán #${payment.id}`}</Link> · {formatVND(payment.amount)} · Khấu trừ cọc</li>)}</ul></div>}
      {!closed && <Button disabled={busy || !data.can_terminate} onClick={() => setAction(data)}>Kiểm tra và xác nhận thanh lý</Button>}
      {closed && <div className="flex flex-wrap gap-4 text-sm"><Link className="font-semibold text-sky-700 underline" to="/admin/rooms">Xem phòng sau bàn giao</Link><Link className="text-sky-700 underline" to="/admin/contracts">Về danh sách hợp đồng</Link></div>}
    </>}
    <Modal isOpen={!!action} onClose={() => { if (!busy) setAction(null) }} title="Xác nhận thanh lý hợp đồng" maxWidth="lg">
      {action && <SettlementConfirmation key={action.revision} preview={action} onBusyChange={setBusy} onAuthFailure={onAuthFailure}
        onSaved={data => { setResult({ key, data }); setAction(null); onTerminated() }}
        onInvalidated={failure => { setResult({ key, error: apiErrorMessage(failure) }); setAction(null) }} />}
    </Modal>
    <Modal isOpen={!!refundAction} onClose={reload} title="Xác nhận đã hoàn đủ cọc" maxWidth="lg">
      {refundAction && <RefundConfirmation key={refundAction.revision} preview={refundAction} onBusyChange={setBusy} onAuthFailure={onAuthFailure}
        onSaved={data => { setResult({ key, data }); setRefundAction(null); onTerminated() }}
        onInvalidated={failure => {
          const status = isAxiosError(failure) ? failure.response?.status : undefined
          const message = status === undefined || status >= 500
            ? 'Chưa xác định được kết quả xác nhận hoàn cọc. Tải đối soát mới và kiểm tra trước khi thao tác tiếp; không chi tiền lần nữa chỉ vì lỗi phản hồi.'
            : apiErrorMessage(failure)
          setResult({ key, error: message }); setRefundAction(null)
        }} />}
    </Modal>
  </section>
}

function RefundConfirmation({ preview, onSaved, onInvalidated, onBusyChange, onAuthFailure }: {
  preview: ContractSettlement; onSaved: (data: ContractSettlement) => void; onInvalidated: (failure: unknown) => void
  onBusyChange: (busy: boolean) => void; onAuthFailure: () => void
}) {
  const flight = useRef(false)
  const form = useForm<ConfirmDepositRefundInput>({ resolver: zodResolver(confirmDepositRefundSchema), defaultValues: {
    expected_revision: preview.revision, expected_refund_amount: preview.deposit_refund_amount, confirmed_paid: false,
  } })
  async function submit(input: ConfirmDepositRefundInput) {
    if (flight.current) return
    flight.current = true; onBusyChange(true)
    try { onSaved(await confirmDepositRefund(preview.contract_id, input)) }
    catch (failure) {
      if (isAxiosError(failure) && failure.response?.status === 422) applyApiErrors(failure, form.setError, ['confirmed_paid', 'expected_refund_amount', 'expected_revision'])
      else onInvalidated(failure) // Close the old form: reread before any further submission after 409/network/5xx.
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; onBusyChange(false) }
  }
  return <form noValidate onSubmit={event => { void form.handleSubmit(submit)(event) }} className="space-y-4">
    <p className="text-sm">Chỉ xác nhận sau khi đã hoàn đủ <strong>{formatVND(preview.deposit_refund_amount)}</strong> cho hợp đồng #{preview.contract_id} bằng tiền mặt hoặc chuyển khoản bên ngoài.</p>
    <p className="text-sm">Nút này chỉ ghi nhận một lần, không chuyển tiền, không tạo biên nhận thu và không hỗ trợ hoàn từng phần hoặc hủy xác nhận.</p>
    <input type="hidden" {...form.register('expected_revision')} />
    <input type="hidden" {...form.register('expected_refund_amount', { valueAsNumber: true })} />
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" {...form.register('confirmed_paid')} disabled={form.formState.isSubmitting} className="mt-1" />Tôi đã hoàn đủ khoản cọc trên ngoài hệ thống và đã kiểm tra đúng người nhận.</label>
    {form.formState.errors.confirmed_paid && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.confirmed_paid.message}</p>}
    {(form.formState.errors.root || form.formState.errors.expected_revision || form.formState.errors.expected_refund_amount) && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.root?.message ?? form.formState.errors.expected_revision?.message ?? form.formState.errors.expected_refund_amount?.message}</p>}
    <Button type="submit" isLoading={form.formState.isSubmitting}>Xác nhận đã hoàn đủ cọc</Button>
  </form>
}

function SettlementConfirmation({ preview, onSaved, onInvalidated, onBusyChange, onAuthFailure }: {
  preview: ContractSettlement; onSaved: (data: ContractSettlement) => void; onInvalidated: (failure: unknown) => void
  onBusyChange: (busy: boolean) => void; onAuthFailure: () => void
}) {
  const flight = useRef(false)
  const form = useForm<TerminateContractInput>({ resolver: zodResolver(terminateContractSchema), defaultValues: { expected_revision: preview.revision, confirmed: false } })
  async function submit(input: TerminateContractInput) {
    if (flight.current) return
    flight.current = true; onBusyChange(true)
    try { onSaved(await terminateContract(preview.contract_id, input)) }
    catch (failure) {
      if (isAxiosError(failure) && failure.response?.status === 422) applyApiErrors(failure, form.setError, ['confirmed', 'expected_revision'])
      else onInvalidated(failure)
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally { flight.current = false; onBusyChange(false) }
  }
  return <form noValidate onSubmit={event => { void form.handleSubmit(submit)(event) }} className="space-y-4">
    <p className="text-sm">Thanh lý hợp đồng #{preview.contract_id}, ngày bàn giao {formatDate(preview.actual_end_date ?? '')}. Thao tác không thể hoàn tác.</p>
    <p className="text-sm">Khấu trừ cọc: <strong>{formatVND(preview.deposit_deducted_amount)}</strong>. Cọc còn phải hoàn: <strong>{formatVND(preview.deposit_refund_amount)}</strong> (chưa xác nhận đã hoàn).</p>
    <p className="text-sm">Còn nợ sau đối soát: <strong>{formatVND(BigInt(preview.outstanding_after))}</strong>.</p>
    <input type="hidden" {...form.register('expected_revision')} />
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" {...form.register('confirmed')} disabled={form.formState.isSubmitting} className="mt-1" />Tôi đã kiểm tra công nợ, tiền cọc và xác nhận trả phòng; cọc dư vẫn là khoản phải hoàn.</label>
    {form.formState.errors.confirmed && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.confirmed.message}</p>}
    {(form.formState.errors.root || form.formState.errors.expected_revision) && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.root?.message ?? form.formState.errors.expected_revision?.message}</p>}
    <Button type="submit" isLoading={form.formState.isSubmitting}>Thanh lý và trả phòng</Button>
  </form>
}
