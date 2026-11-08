import { useRef, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { paymentSubmissionError } from './submissionError'
import { formatVND } from '@/lib/format'
import { recordDirectPayment, submitPaymentProof } from './api'
import { directPaymentSchema, paymentProofSchema, type DirectPaymentInput, type PaymentProofInput } from './schemas'

interface Props {
  invoiceId: number
  outstanding: number
  revision?: string | null
  onSaved: () => void
  onReload: () => void
  onBusyChange: (busy: boolean) => void
  onAuthFailure: () => void
}

export function PaymentProofForm({ invoiceId, outstanding, onSaved, onReload, onBusyChange, onAuthFailure }: Props) {
  const flight = useRef(false)
  const [requiresReload, setRequiresReload] = useState(false)
  const form = useForm<PaymentProofInput>({
    resolver: zodResolver(paymentProofSchema),
    defaultValues: { amount: outstanding },
  })
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (flight.current) {
      event.preventDefault()
      return
    }
    flight.current = true
    onBusyChange(true)
    let mustReload = false
    try {
      await form.handleSubmit(async (input) => {
        try {
          await submitPaymentProof(invoiceId, input)
          onSaved()
        } catch (failure) {
          if (isAxiosError(failure) && failure.response?.status === 422)
            for (const key of ['amount', 'proof'] as const) {
              const message = failure.response.data?.errors?.[key]?.[0]
              if (typeof message === 'string') form.setError(key, { message })
            }
          const issue = paymentSubmissionError(failure)
          mustReload = issue.requiresReload
          setRequiresReload(mustReload)
          form.setError('root', { message: issue.message })
          if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
        }
      })(event)
    } finally {
      flight.current = mustReload
      onBusyChange(false)
    }
  }
  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
        Còn phải trả: <strong>{formatVND(outstanding)}</strong>. Gửi ảnh tạo khoản chờ đối soát để Quản trị viên xác nhận.
      </p>
      <fieldset disabled={form.formState.isSubmitting || requiresReload} className="space-y-4">
        <label className="block text-sm font-bold">
          Số tiền đã chuyển (VND)
          <input
            type="number"
            step="1"
            placeholder={`VD: ${outstanding}`}
            {...form.register('amount', { valueAsNumber: true })}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 placeholder:text-slate-400"
          />
          <span className="text-xs text-rose-700">{form.formState.errors.amount?.message}</span>
        </label>
        <label className="block text-sm font-bold">
          Ảnh minh chứng chuyển khoản
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => form.setValue('proof', event.target.files?.[0], { shouldValidate: true })}
            className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-sm"
          />
          <span className="text-xs text-rose-700">{form.formState.errors.proof?.message}</span>
        </label>
      </fieldset>
      {form.formState.errors.root && (
        <p role="alert" className="text-sm text-rose-700">
          {form.formState.errors.root.message}
        </p>
      )}
      <Button type="submit" disabled={requiresReload} isLoading={form.formState.isSubmitting}>
        Gửi minh chứng chờ đối soát
      </Button>
      {requiresReload && (
        <Button type="button" variant="outline" onClick={onReload}>
          Tải lại hóa đơn và thanh toán
        </Button>
      )}
    </form>
  )
}

export function DirectPaymentForm({ invoiceId, outstanding, revision, onSaved, onReload, onBusyChange, onAuthFailure }: Props) {
  const flight = useRef(false)
  const [requiresReload, setRequiresReload] = useState(false)
  const form = useForm<DirectPaymentInput>({
    resolver: zodResolver(directPaymentSchema),
    defaultValues: { amount: outstanding, method: 'cash', confirmed_received: true },
  })
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (flight.current) {
      event.preventDefault()
      return
    }
    flight.current = true
    onBusyChange(true)
    let mustReload = false
    try {
      await form.handleSubmit(async (input) => {
        try {
          await recordDirectPayment(invoiceId, revision!, input)
          onSaved()
        } catch (failure) {
          if (isAxiosError(failure) && failure.response?.status === 422)
            for (const key of ['amount', 'method', 'confirmed_received'] as const) {
              const message = failure.response.data?.errors?.[key]?.[0]
              if (typeof message === 'string') form.setError(key, { message })
            }
          const issue = paymentSubmissionError(failure)
          mustReload = issue.requiresReload
          setRequiresReload(mustReload)
          form.setError('root', { message: issue.message })
          if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
        }
      })(event)
    } finally {
      flight.current = mustReload
      onBusyChange(false)
    }
  }
  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        Còn phải trả: <strong>{formatVND(outstanding)}</strong>. Hệ thống đã điền sẵn số tiền còn nợ để ghi nhận nhanh.
      </p>
      <fieldset disabled={form.formState.isSubmitting || requiresReload} className="space-y-4">
        <label className="block text-sm font-bold">
          Số tiền thực nhận (VND)
          <input
            type="number"
            step="1"
            placeholder={`VD: ${outstanding}`}
            {...form.register('amount', { valueAsNumber: true })}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 placeholder:text-slate-400"
          />
          <span className="text-xs text-rose-700">{form.formState.errors.amount?.message}</span>
        </label>
        <label className="block text-sm font-bold">
          Hình thức thực nhận
          <select {...form.register('method')} className="mt-1 w-full rounded-xl border border-slate-300 p-3">
            <option value="cash">Tiền mặt</option>
            <option value="bank_transfer">Chuyển khoản đã đối chiếu</option>
          </select>
        </label>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" {...form.register('confirmed_received')} className="mt-1 accent-sky-600" />
          Tôi xác nhận đã thực nhận đúng số tiền trên.
        </label>
        <p className="text-xs text-rose-700">{form.formState.errors.confirmed_received?.message}</p>
      </fieldset>
      {form.formState.errors.root && (
        <p role="alert" className="text-sm text-rose-700">
          {form.formState.errors.root.message}
        </p>
      )}
      <Button type="submit" disabled={!revision || requiresReload} isLoading={form.formState.isSubmitting}>
        Ghi nhận thực nhận
      </Button>
      {requiresReload && (
        <Button type="button" variant="outline" onClick={onReload}>
          Tải lại hóa đơn và thanh toán
        </Button>
      )}
    </form>
  )
}
