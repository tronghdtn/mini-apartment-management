import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Controller, useForm, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Camera, Droplets, Info, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { businessToday } from '@/lib/format'
import { getSubmissionContext, sendSubmission } from './api'
import { meterBatchSchema, toSubmissions, type MeterBatchInput } from './schemas'
import { SubmissionList } from './SubmissionList'
import type { SubmissionContext } from './types'

const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100'
const labelClass = 'block text-sm font-medium text-slate-700'
const errorClass = 'mt-1 block text-xs text-rose-700'

function meterIcon(name: string) {
  return /nước|water/i.test(name)
    ? <Droplets className="h-4 w-4 text-sky-600" aria-hidden="true" />
    : <Zap className="h-4 w-4 text-amber-500" aria-hidden="true" />
}

export function ResidentMeterReadingsPanel() {
  const { refresh } = useAuth()
  const [context, setContext] = useState<SubmissionContext>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [contextRevision, setContextRevision] = useState(0)
  const [results, setResults] = useState<{ ok: string[]; failed: string[] }>()
  const flight = useRef(false)
  const files = useRef<(HTMLInputElement | null)[]>([])
  const [today] = useState(() => businessToday())
  const form = useForm<MeterBatchInput>({
    resolver: zodResolver(meterBatchSchema),
    defaultValues: { month: today.slice(0, 7), reading_date: today, entries: [] },
  })

  useEffect(() => {
    const abort = new AbortController()
    getSubmissionContext(abort.signal).then(data => {
      if (abort.signal.aborted) return
      setContext(data)
      setError('')
      // Mỗi đồng hồ (điện, nước) của hợp đồng là một phần riêng trong form.
      form.setValue('entries', data.services.map(service => ({ service_id: service.id, current_reading: '', photo: undefined })))
    })
      .catch(failure => { if (!abort.signal.aborted) { setError(isAxiosError(failure) && failure.response?.status === 403 ? 'Chỉ cư dân có hợp đồng đang thuê mới được gửi chỉ số mới. Lịch sử của bạn vẫn được giữ bên dưới.' : apiErrorMessage(failure)); if (isAxiosError(failure) && failure.response?.status === 401) void refresh() } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [contextRevision, refresh, form])

  function clearEntry(index: number) {
    form.setValue(`entries.${index}.current_reading`, '')
    form.setValue(`entries.${index}.photo`, undefined)
    const input = files.current[index]
    if (input) input.value = ''
  }

  async function submit(value: MeterBatchInput) {
    setResults(undefined)
    const ok: string[] = []
    const failed: string[] = []
    // Gửi lần lượt: đồng hồ nào thành công thì xóa ô, đồng hồ lỗi giữ lại dữ liệu và báo lỗi đúng chỗ.
    for (const { index, input } of toSubmissions(value)) {
      const name = context?.services.find(service => service.id === input.service_id)?.name ?? 'Đồng hồ'
      try {
        await sendSubmission(input)
        ok.push(name)
        clearEntry(index)
      } catch (failure) {
        failed.push(name)
        let mapped = false
        if (isAxiosError(failure) && failure.response?.status === 422) {
          const fields: unknown = failure.response.data?.errors
          if (fields && typeof fields === 'object') Object.entries(fields).forEach(([field, messages]) => {
            if (!Array.isArray(messages) || typeof messages[0] !== 'string') return
            const path = field === 'period' ? 'month' : field === 'reading_date' ? 'reading_date' : ['current_reading', 'photo'].includes(field) ? `entries.${index}.${field}` : null
            if (path) { form.setError(path as Path<MeterBatchInput>, { message: messages[0] }); mapped = true }
          })
        }
        if (!mapped) form.setError(`entries.${index}.current_reading`, { message: apiErrorMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
      }
    }
    setResults({ ok, failed })
    if (ok.length) setRevision(value => value + 1)
  }

  async function handleSubmission(event: FormEvent<HTMLFormElement>) {
    if (flight.current) { event.preventDefault(); return }
    flight.current = true
    try { await form.handleSubmit(submit)(event) } finally { flight.current = false }
  }

  const errors = form.formState.errors
  return (
    <div className="space-y-6">
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Camera className="h-5 w-5 text-sky-600" aria-hidden="true" />Gửi chỉ số điện nước</h2>
          <p className="mt-1 text-sm text-slate-600">Chụp ảnh đồng hồ và nhập số đang hiện trên đó. Ban quản lý đối chiếu ảnh rồi mới ghi thành chỉ số chính thức. Ảnh chỉ bạn và ban quản lý xem được.</p>
        </div>
        {results && results.ok.length > 0 && (
          <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">Đã gửi {results.ok.join(' và ')}, đang chờ ban quản lý duyệt.</p>
        )}
        {loading ? <p role="status" className="text-sm text-slate-500">Đang tải hợp đồng đang thuê…</p>
          : error ? (
            <div role="alert" className="space-y-3 text-sm">
              <p>{error}</p>
              <Button variant="outline" onClick={() => { setLoading(true); setContextRevision(value => value + 1) }}>Tải lại</Button>
            </div>
          ) : context && (
            <form noValidate onSubmit={handleSubmission} className="space-y-5">
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Phòng <strong>{context.room.code}</strong> · {context.room.building_name}</p>
              <fieldset disabled={form.formState.isSubmitting} className="min-w-0 space-y-5">
                <legend className="sr-only">Thông tin chỉ số</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Tháng tiêu thụ
                    <input type="month" max={today.slice(0, 7)} placeholder="YYYY-MM" {...form.register('month')} className={inputClass} />
                    <span className="mt-1 block text-xs text-slate-500">Tháng mà lượng điện, nước này đã dùng.</span>
                    <span className={errorClass}>{errors.month?.message}</span>
                  </label>
                  <label className={labelClass}>
                    Ngày đọc số
                    <input type="date" max={today} {...form.register('reading_date')} className={inputClass} />
                    <span className="mt-1 block text-xs text-slate-500">Ngày bạn xem đồng hồ.</span>
                    <span className={errorClass}>{errors.reading_date?.message}</span>
                  </label>
                </div>
                <p className="flex gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Nhập đúng <strong className="font-semibold">số đang hiện trên đồng hồ</strong>, không phải số đã dùng trong tháng. Có thể gửi điện, nước hoặc cả hai.</span>
                </p>
                <div className="grid gap-4 lg:grid-cols-2">
                  {context.services.map((service, index) => (
                    <div key={service.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                      <h3 className="flex items-center gap-2 font-semibold text-slate-900">{meterIcon(service.name)}{service.name}</h3>
                      <label className={labelClass}>
                        Số trên đồng hồ
                        <div className="relative">
                          <input type="text" inputMode="decimal" placeholder="VD: 1250.5" {...form.register(`entries.${index}.current_reading`)} className={`${inputClass} pr-14`} />
                          <span className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-slate-400">{service.unit}</span>
                        </div>
                        <span className={errorClass}>{errors.entries?.[index]?.current_reading?.message}</span>
                      </label>
                      <Controller
                        name={`entries.${index}.photo`}
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <label className={labelClass}>
                            Ảnh đồng hồ
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              name={field.name}
                              ref={element => { field.ref(element); files.current[index] = element }}
                              onBlur={field.onBlur}
                              onChange={event => field.onChange(event.target.files?.[0])}
                              className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-medium`}
                            />
                            <span className="mt-1 block text-xs text-slate-500">JPG, PNG hoặc WebP, tối đa 5 MB. Chụp rõ các con số.</span>
                            <span className={errorClass}>{fieldState.error?.message}</span>
                          </label>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
              {errors.entries?.root?.message || errors.entries?.message
                ? <p role="alert" className="text-sm text-rose-700">{errors.entries?.root?.message ?? errors.entries?.message}</p>
                : null}
              {results && results.failed.length > 0 && <p role="alert" className="text-sm text-rose-700">Chưa gửi được {results.failed.join(' và ')}. Kiểm tra lỗi ở ô tương ứng rồi gửi lại.</p>}
              <Button type="submit" disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting}>Gửi chỉ số</Button>
            </form>
          )}
      </section>
      <SubmissionList revision={revision} />
    </div>
  )
}
