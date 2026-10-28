import { useRef, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate, formatVND } from '@/lib/format'
import { invoiceAction, removeOtherCharge, saveOtherCharge } from './api'
import { invoiceReasonSchema, otherChargeSchema, type InvoiceReasonInput, type OtherChargeInput } from './schemas'
import type { Invoice, InvoiceItem } from './types'

export interface InvoiceDialog { kind: 'issue' | 'cancel' | 'other' | 'remove'; invoice: Invoice; item?: InvoiceItem }
export function InvoiceActionForm({ action, onSaved, onBusyChange, onAuthFailure }: { action: InvoiceDialog; onSaved: () => void; onBusyChange: (busy: boolean) => void; onAuthFailure: () => void }) {
  const flight = useRef(false)
  const [pending, setPending] = useState(false)
  const other = useForm<OtherChargeInput>({ resolver: zodResolver(otherChargeSchema), defaultValues: { description: action.item?.description ?? '', amount: action.item?.amount, basis: action.item?.basis ?? '' } })
  const reason = useForm<InvoiceReasonInput>({ resolver: zodResolver(invoiceReasonSchema), defaultValues: { reason: '' } })
  const isOther = action.kind === 'other'
  const busy = pending || other.formState.isSubmitting || reason.formState.isSubmitting
  async function run(input: OtherChargeInput | InvoiceReasonInput) {
    try {
      const revision = action.invoice.revision!
      if (action.kind === 'other') await saveOtherCharge(action.invoice.id, revision, input as OtherChargeInput, action.item?.id)
      else if (action.kind === 'remove') await removeOtherCharge(action.invoice.id, action.item!.id, revision, (input as InvoiceReasonInput).reason)
      else await invoiceAction(action.invoice.id, action.kind, revision, action.kind === 'cancel' ? (input as InvoiceReasonInput).reason : undefined)
      onSaved()
    } catch (failure) {
      if (isOther && isAxiosError(failure) && failure.response?.status === 422) {
        for (const key of ['description', 'amount', 'basis'] as const) {
          const message = failure.response.data?.errors?.[key]?.[0]; if (typeof message === 'string') other.setError(key, { message })
        }
      }
      let message = apiErrorMessage(failure)
      if (isAxiosError(failure) && failure.response?.status === 409) message += ' Đóng biểu mẫu và tải lại hóa đơn để kiểm tra trước khi tiếp tục.'
      if (isOther) other.setError('root', { message }); else reason.setError('root', { message })
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (flight.current) { event.preventDefault(); return }
    flight.current = true; setPending(true); onBusyChange(true)
    try {
      if (isOther) await other.handleSubmit(run)(event)
      else if (action.kind === 'issue') { event.preventDefault(); await run({ reason: '' }) }
      else await reason.handleSubmit(run)(event)
    } finally { flight.current = false; setPending(false); onBusyChange(false) }
  }
  const error = isOther ? other.formState.errors.root?.message : reason.formState.errors.root?.message
  return <form noValidate onSubmit={submit} className="space-y-4"><p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">Hóa đơn #{action.invoice.id} · Kỳ {formatDate(action.invoice.period)} · Tổng {formatVND(action.invoice.total_amount)}. {action.kind === 'issue' ? 'Sau phát hành, khoản mục/hạn/tổng sẽ bất biến. Tổng 0đ không tạo giao dịch thu tiền.' : 'Thao tác có kiểm tra phiên bản và lưu trên hệ thống.'}</p>
    <fieldset disabled={busy} className="space-y-4">{isOther ? <><label className="block text-sm font-bold">Tên khoản khác<input {...other.register('description')} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /><span className="text-xs text-rose-700">{other.formState.errors.description?.message}</span></label><label className="block text-sm font-bold">Số tiền khoản khác (VND)<input type="number" step="1" {...other.register('amount', { valueAsNumber: true })} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /><span className="text-xs text-rose-700">{other.formState.errors.amount?.message}</span></label><label className="block text-sm font-bold">Lý do/căn cứ thu<textarea {...other.register('basis')} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" /><span className="text-xs text-rose-700">{other.formState.errors.basis?.message}</span></label></> : action.kind !== 'issue' && <label className="block text-sm font-bold">Lý do thao tác<textarea {...reason.register('reason')} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" /><span className="text-xs text-rose-700">{reason.formState.errors.reason?.message}</span></label>}</fieldset>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<Button type="submit" disabled={busy}>Xác nhận {action.kind === 'issue' ? 'phát hành' : action.kind === 'cancel' ? 'hủy hóa đơn' : action.kind === 'remove' ? 'gỡ khoản' : 'lưu khoản khác'}</Button>
  </form>
}
