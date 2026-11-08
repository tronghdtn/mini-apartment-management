import { useRef, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { paymentSubmissionError } from './submissionError'
import { formatVND } from '@/lib/format'
import { reviewPayment } from './api'
import { confirmPaymentSchema, rejectPaymentSchema, type ConfirmPaymentInput, type RejectPaymentInput } from './schemas'
import type { Payment } from './types'

export function PaymentReviewForm({
  payment,
  action,
  onSaved,
  onReload,
  onBusyChange,
  onAuthFailure,
}: {
  payment: Payment
  action: 'confirm' | 'reject'
  onSaved: () => void
  onReload: () => void
  onBusyChange: (busy: boolean) => void
  onAuthFailure: () => void
}) {
  const flight = useRef(false)
  const recovery = useRef(false)
  const [requiresReload, setRequiresReload] = useState(false)
  const confirm = useForm<ConfirmPaymentInput>({
    resolver: zodResolver(confirmPaymentSchema),
    defaultValues: { confirmed_received: true },
  })
  const reject = useForm<RejectPaymentInput>({
    resolver: zodResolver(rejectPaymentSchema),
    defaultValues: { reject_reason: '' },
  })
  const busy = confirm.formState.isSubmitting || reject.formState.isSubmitting
  async function run(input: ConfirmPaymentInput | RejectPaymentInput) {
    try {
      await reviewPayment(payment, action, input)
      onSaved()
    } catch (failure) {
      const issue = paymentSubmissionError(failure)
      recovery.current = issue.requiresReload
      setRequiresReload(issue.requiresReload)
      const message = issue.message
      if (action === 'confirm') confirm.setError('root', { message })
      else reject.setError('root', { message })
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (flight.current) {
      event.preventDefault()
      return
    }
    flight.current = true
    onBusyChange(true)
    try {
      await (action === 'confirm' ? confirm.handleSubmit(run) : reject.handleSubmit(run))(event)
    } finally {
      flight.current = recovery.current
      onBusyChange(false)
    }
  }
  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
        Thanh toán #{payment.id} · <strong>{formatVND(payment.amount)}</strong> · Hóa đơn{' '}
        {payment.invoice.invoice_number ?? `#${payment.invoice_id}`} · Phòng {payment.invoice.room_code}.
      </p>
      <fieldset disabled={busy || requiresReload}>
        {action === 'confirm' ? (
          <>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...confirm.register('confirmed_received')} className="mt-1 accent-sky-600" />
              Đã thực nhận đủ {formatVND(payment.amount)}, khớp khoản đang đối soát.
            </label>
            <p className="text-xs text-rose-700">{confirm.formState.errors.confirmed_received?.message}</p>
          </>
        ) : (
          <label className="block text-sm font-bold">
            Lý do từ chối thanh toán
            <textarea
              placeholder="VD: Ảnh chụp mờ không rõ mã giao dịch hoặc số tiền chưa khớp..."
              {...reject.register('reject_reason')}
              className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3 placeholder:text-slate-400"
            />
            <span className="text-xs text-rose-700">{reject.formState.errors.reject_reason?.message}</span>
          </label>
        )}
      </fieldset>
      {(confirm.formState.errors.root || reject.formState.errors.root) && (
        <p role="alert" className="text-sm text-rose-700">
          {confirm.formState.errors.root?.message ?? reject.formState.errors.root?.message}
        </p>
      )}
      <Button type="submit" disabled={busy || requiresReload}>
        {action === 'confirm' ? 'Xác nhận đã thực nhận' : 'Từ chối và lưu lý do'}
      </Button>
      {requiresReload && (
        <Button type="button" variant="outline" onClick={onReload}>
          Tải lại hóa đơn và thanh toán
        </Button>
      )}
    </form>
  )
}
