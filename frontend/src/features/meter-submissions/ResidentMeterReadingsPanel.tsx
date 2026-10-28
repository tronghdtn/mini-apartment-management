import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Controller, useForm, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getSubmissionContext, sendSubmission } from './api'
import { submissionSchema, type SubmissionInput } from './schemas'
import { SubmissionList } from './SubmissionList'
import type { SubmissionContext } from './types'

const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm'
export function ResidentMeterReadingsPanel() {
  const { refresh } = useAuth()
  const [context, setContext] = useState<SubmissionContext>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [contextRevision, setContextRevision] = useState(0)
  const [message, setMessage] = useState('')
  const flight = useRef(false)
  const file = useRef<HTMLInputElement | null>(null)
  const form = useForm<SubmissionInput>({ resolver: zodResolver(submissionSchema), defaultValues: { service_id: 0, period: '', reading_date: '', current_reading: '' } })
  useEffect(() => {
    const abort = new AbortController()
    getSubmissionContext(abort.signal).then(data => { if (!abort.signal.aborted) { setContext(data); setError('') } })
      .catch(failure => { if (!abort.signal.aborted) { setError(isAxiosError(failure) && failure.response?.status === 403 ? 'Chỉ cư dân có hợp đồng đang thuê mới được gửi chỉ số mới. Lịch sử của bạn vẫn được giữ bên dưới.' : apiErrorMessage(failure)); if (isAxiosError(failure) && failure.response?.status === 401) void refresh() } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [contextRevision, refresh])
  async function submit(input: SubmissionInput) {
    setMessage('')
    try {
      const saved = await sendSubmission(input)
      setMessage(`Đã gửi yêu cầu #${saved.id}, đang chờ Admin duyệt. Chưa ghi chỉ số chính thức hoặc phát sinh khoản thu.`)
      form.reset(); if (file.current) file.current.value = ''; setRevision(value => value + 1)
    } catch (failure) {
      if (isAxiosError(failure) && failure.response?.status === 422) {
        const fields: unknown = failure.response.data?.errors
        if (fields && typeof fields === 'object') Object.entries(fields).forEach(([field, messages]) => {
          if (['service_id', 'period', 'reading_date', 'current_reading', 'photo'].includes(field) && Array.isArray(messages) && typeof messages[0] === 'string') form.setError(field as Path<SubmissionInput>, { message: messages[0] })
        })
      }
      form.setError('root', { message: apiErrorMessage(failure) })
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
    }
  }
  async function handleSubmission(event: FormEvent<HTMLFormElement>) {
    if (flight.current) { event.preventDefault(); return }
    flight.current = true
    try { await form.handleSubmit(submit)(event) } finally { flight.current = false }
  }
  return <div className="space-y-6"><section className="space-y-4 rounded-2xl border border-sky-200 bg-white p-4 sm:p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><Camera className="h-5 w-5 text-sky-600" />Gửi ảnh chỉ số điện nước</h2><p className="text-sm text-slate-600">Gửi số đo và ảnh thực tế. Ảnh được bảo vệ riêng tư; chỉ bạn và Admin có quyền xem.</p>
    {message && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</p>}
    {loading ? <p role="status">Đang tải hợp đồng đang thuê…</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => { setLoading(true); setContextRevision(value => value + 1) }}>Tải lại hợp đồng gửi chỉ số</Button></div> : context && <><p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{context.room.building_name} · Phòng {context.room.code} · Hợp đồng #{context.contract_id}</p><form noValidate onSubmit={handleSubmission} className="space-y-4"><fieldset disabled={form.formState.isSubmitting} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Dịch vụ gửi chỉ số<select {...form.register('service_id', { valueAsNumber: true })} className={inputClass}><option value="0">Chọn Điện/Nước</option>{context.services.map(service => <option key={service.id} value={service.id}>{service.name} ({service.unit})</option>)}</select><span className="text-xs text-rose-700">{form.formState.errors.service_id?.message}</span></label>
      <label className="text-sm font-semibold">Kỳ tiêu thụ gửi chỉ số<input type="date" {...form.register('period')} className={inputClass} /><span className="text-xs text-rose-700">{form.formState.errors.period?.message}</span></label>
      <label className="text-sm font-semibold">Ngày đo gửi chỉ số<input type="date" {...form.register('reading_date')} className={inputClass} /><span className="text-xs text-rose-700">{form.formState.errors.reading_date?.message}</span></label>
      <label className="text-sm font-semibold">Chỉ số cư dân gửi<input type="text" inputMode="decimal" {...form.register('current_reading')} className={inputClass} /><span className="text-xs text-rose-700">{form.formState.errors.current_reading?.message}</span></label>
      <Controller name="photo" control={form.control} render={({ field, fieldState }) => <label className="text-sm font-semibold sm:col-span-2">Ảnh chỉ số (JPG/PNG/WebP, tối đa 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" name={field.name} ref={element => { field.ref(element); file.current = element }} onBlur={field.onBlur} onChange={event => field.onChange(event.target.files?.[0])} className={inputClass} /><span className="text-xs text-rose-700">{fieldState.error?.message}</span></label>} />
    </fieldset>{form.formState.errors.root && <p role="alert" className="text-sm text-rose-700">{form.formState.errors.root.message}</p>}<Button type="submit" disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting}>Gửi chỉ số chờ duyệt</Button></form></>}
  </section><SubmissionList revision={revision} /></div>
}
