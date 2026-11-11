import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { apiActionMessage, apiErrorMessage } from '@/lib/apiErrors'
import { createInvoice, getInvoiceContracts } from './api'
import { createInvoiceSchema, type CreateInvoiceInput } from './schemas'
import type { Invoice, InvoiceContractOption } from './types'
export function CreateInvoiceForm({ onSaved, onBusyChange, onAuthFailure }: { onSaved: (invoice: Invoice) => void; onBusyChange: (busy: boolean) => void; onAuthFailure: () => void }) {
  const [options, setOptions] = useState<InvoiceContractOption[]>()
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const flight = useRef(false)
  const form = useForm<CreateInvoiceInput>({ resolver: zodResolver(createInvoiceSchema), defaultValues: { contract_id: 0, period: '' } })
  useEffect(() => { const abort = new AbortController(); getInvoiceContracts(abort.signal).then(rows => { if (!abort.signal.aborted) { setOptions(rows); setError('') } })
    .catch(failure => { if (!abort.signal.aborted) { setError(apiErrorMessage(failure)); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure() } }); return () => abort.abort() }, [reload, onAuthFailure])
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (flight.current) { event.preventDefault(); return }
    flight.current = true; onBusyChange(true)
    try { await form.handleSubmit(async input => {
      try { onSaved(await createInvoice(input)) }
      catch (failure) {
        if (isAxiosError(failure) && failure.response?.status === 422) {
          for (const key of ['contract_id', 'period'] as const) {
            const message = failure.response.data?.errors?.[key]?.[0]
            if (typeof message === 'string') form.setError(key, { message })
          }
        }
        form.setError('root', { message: apiActionMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
      }
    })(event) } finally { flight.current = false; onBusyChange(false) }
  }
  return <form noValidate onSubmit={submit} className="space-y-4"><p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">Hệ thống tính tiền từ hợp đồng và chỉ số chính thức. Có thể chuẩn bị kỳ tương lai; chỉ phát hành từ ngày đầu kỳ. Thiếu điện/nước kỳ trước sẽ bị chặn.</p>
    {error ? <div role="alert"><p>{error}</p><Button type="button" variant="outline" onClick={() => setReload(value => value + 1)}>Tải lại hợp đồng</Button></div> : !options ? <p role="status">Đang tải hợp đồng…</p> : <fieldset disabled={form.formState.isSubmitting} className="space-y-4"><label className="block text-sm font-bold">Hợp đồng lập hóa đơn<select {...form.register('contract_id', { valueAsNumber: true })} className="mt-1 w-full rounded-xl border border-slate-300 p-3"><option value="0">Chọn hợp đồng đang hiệu lực</option>{options.map(item => <option key={item.id} value={item.id}>{item.contract_number ?? `#${item.id}`} · {item.room.code} · {item.room.building.name} · {item.tenant.full_name}</option>)}</select><span className="text-xs text-rose-700">{form.formState.errors.contract_id?.message}</span></label>
      <label className="block text-sm font-bold">Kỳ hóa đơn (ngày 01)<input type="date" {...form.register('period')} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /><span className="text-xs text-rose-700">{form.formState.errors.period?.message}</span></label></fieldset>}
    {form.formState.errors.root && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.root.message}</p>}<Button type="submit" disabled={!options?.length || !!error || form.formState.isSubmitting} isLoading={form.formState.isSubmitting}>Lập hóa đơn nháp</Button></form>
}
